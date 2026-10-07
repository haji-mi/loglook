import { ParsedLut } from '../types';

// 顶点着色器源码 (GLSL 3.00 es)
const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  // a_position 范围是 [-1, 1]
  // 转换到 uv 坐标 [0, 1]
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// 片元着色器源码 (GLSL 3.00 es)
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler3D;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_imageTexture;
uniform sampler3D u_lutTexture;
uniform int u_lutSize;
uniform float u_intensity;       // 0.0 ~ 1.0
uniform float u_hasLut;          // 0.0 = 纯原图, 1.0 = 使用 LUT
uniform float u_enableSplit;     // 0.0 = 关闭分割, 1.0 = 开启左右分割
uniform float u_splitPosition;   // 0.0 ~ 1.0 分割线 x 坐标
uniform vec2 u_resolution;       // 画布宽高，用于绘制分割线

void main() {
  vec4 origColor = texture(u_imageTexture, v_uv);

  if (u_hasLut < 0.5) {
    fragColor = origColor;
    return;
  }

  // 计算 3D LUT 坐标，带有精确的半像素偏移校正
  // 范围从 0.5 / size 到 (size - 0.5) / size
  vec3 scale = vec3((float(u_lutSize) - 1.0) / float(u_lutSize));
  vec3 offset = vec3(0.5 / float(u_lutSize));
  vec3 lutCoord = clamp(origColor.rgb, 0.0, 1.0) * scale + offset;

  // 三线性采样 3D 纹理
  vec3 lutColor = texture(u_lutTexture, lutCoord).rgb;

  // 强度混合
  vec3 targetColor = mix(origColor.rgb, lutColor, u_intensity);

  // 分割模式处理（左原图、右 LUT）
  if (u_enableSplit > 0.5) {
    float splitX = u_splitPosition;
    float pixelWidth = 1.5 / u_resolution.x;

    // 分割线高亮显示（1.5 像素宽度的白色分割线）
    if (abs(v_uv.x - splitX) < pixelWidth) {
      fragColor = vec4(1.0, 1.0, 1.0, 1.0);
      return;
    }

    if (v_uv.x < splitX) {
      fragColor = origColor;
    } else {
      fragColor = vec4(targetColor, origColor.a);
    }
  } else {
    fragColor = vec4(targetColor, origColor.a);
  }
}
`;

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('无法创建 WebGL 着色器');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`着色器编译失败: ${info}`);
  }
  return shader;
}

export class WebGLLutRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  // 属性与 Uniform 位置
  private posAttr: number;
  private imageTexUniform: WebGLUniformLocation;
  private lutTexUniform: WebGLUniformLocation;
  private lutSizeUniform: WebGLUniformLocation;
  private intensityUniform: WebGLUniformLocation;
  private hasLutUniform: WebGLUniformLocation;
  private enableSplitUniform: WebGLUniformLocation;
  private splitPositionUniform: WebGLUniformLocation;
  private resolutionUniform: WebGLUniformLocation;

  private quadVao: WebGLVertexArrayObject;
  private currentImageTexture: WebGLTexture | null = null;
  private lutTextureCache: Map<string, WebGLTexture> = new Map();
  private supportsFloatLinear: boolean = false;

  constructor(customCanvas?: HTMLCanvasElement) {
    this.canvas = customCanvas || document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
      premultipliedAlpha: false,
    });

    if (!gl) {
      throw new Error('当前浏览器环境不支持 WebGL2，无法使用 3D 纹理进行硬件级 LUT 渲染');
    }
    this.gl = gl;

    // 探测浮点三线性插值扩展
    this.supportsFloatLinear = !!gl.getExtension('OES_texture_float_linear');

    // 编译着色器与链接程序
    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    const program = gl.createProgram();
    if (!program) throw new Error('无法创建 WebGL 程序');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`WebGL 程序链接失败: ${info}`);
    }
    this.program = program;

    // 获取 Uniforms
    this.posAttr = gl.getAttribLocation(program, 'a_position');
    this.imageTexUniform = gl.getUniformLocation(program, 'u_imageTexture')!;
    this.lutTexUniform = gl.getUniformLocation(program, 'u_lutTexture')!;
    this.lutSizeUniform = gl.getUniformLocation(program, 'u_lutSize')!;
    this.intensityUniform = gl.getUniformLocation(program, 'u_intensity')!;
    this.hasLutUniform = gl.getUniformLocation(program, 'u_hasLut')!;
    this.enableSplitUniform = gl.getUniformLocation(program, 'u_enableSplit')!;
    this.splitPositionUniform = gl.getUniformLocation(program, 'u_splitPosition')!;
    this.resolutionUniform = gl.getUniformLocation(program, 'u_resolution')!;

    // 设置全屏四边形顶点数据
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('无法创建 VAO');
    this.quadVao = vao;
    gl.bindVertexArray(vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    // 两个三角形拼成的四边形，注意 WebGL 坐标中 Y 轴正方向朝上
    // 为配合图片正常方向（左上角为原点），我们将顶点 Y 轴与图片翻转对齐
    const quadVertices = new Float32Array([
      -1,  1, // 左上
      -1, -1, // 左下
       1,  1, // 右上
       1,  1, // 右上
      -1, -1, // 左下
       1, -1, // 右下
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.posAttr);
    gl.vertexAttribPointer(this.posAttr, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // 默认开启图片翻转，使 DOM 坐标系与 WebGL 纹理坐标系完美一致
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 上传/更新原图纹理
   */
  public setImageSource(source: TexImageSource, width: number, height: number): void {
    const gl = this.gl;
    if (this.currentImageTexture) {
      gl.deleteTexture(this.currentImageTexture);
      this.currentImageTexture = null;
    }

    const tex = gl.createTexture();
    if (!tex) throw new Error('无法创建图片纹理');
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    this.currentImageTexture = tex;

    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  /**
   * 逐帧高性能更新视频纹理（无需重建 Texture 对象）
   */
  public updateVideoSource(video: HTMLVideoElement): void {
    const gl = this.gl;
    if (!this.currentImageTexture) {
      this.setImageSource(
        video,
        video.videoWidth || this.canvas.width,
        video.videoHeight || this.canvas.height
      );
      return;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.currentImageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, video);
  }

  /**
   * 为指定的 LUT 创建或获取 3D 纹理
   */
  public getOrCreateLutTexture(lut: ParsedLut): WebGLTexture {
    const gl = this.gl;
    if (this.lutTextureCache.has(lut.id)) {
      return this.lutTextureCache.get(lut.id)!;
    }

    const tex = gl.createTexture();
    if (!tex) throw new Error('无法创建 3D LUT 纹理');
    gl.bindTexture(gl.TEXTURE_3D, tex);

    // 设置三线性过滤和边缘 Clamp
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const s = lut.size;

    // 优先使用 RGBA8 保证全平台（iOS Safari / Chrome）100% 硬件三线性插值支持
    // 若支持浮点线性插值，也可以使用浮点纹理
    if (this.supportsFloatLinear) {
      try {
        gl.texImage3D(
          gl.TEXTURE_3D,
          0,
          gl.RGBA16F,
          s,
          s,
          s,
          0,
          gl.RGBA,
          gl.FLOAT,
          lut.data
        );
      } catch {
        // 回退到 byteData RGBA8
        gl.texImage3D(
          gl.TEXTURE_3D,
          0,
          gl.RGBA8,
          s,
          s,
          s,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          lut.byteData
        );
      }
    } else {
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.RGBA8,
        s,
        s,
        s,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        lut.byteData
      );
    }

    this.lutTextureCache.set(lut.id, tex);
    return tex;
  }

  /**
   * 渲染画面
   * @param options 渲染配置
   */
  public render(options: {
    lut?: ParsedLut | null;
    intensity?: number;      // 0 ~ 1, 默认 1
    enableSplit?: boolean;   // 是否开启分割滑杆
    splitPosition?: number; // 0 ~ 1, 默认 0.5
    targetWidth?: number;
    targetHeight?: number;
  }): void {
    const gl = this.gl;
    if (!this.currentImageTexture) {
      return;
    }

    const {
      lut = null,
      intensity = 1.0,
      enableSplit = false,
      splitPosition = 0.5,
      targetWidth = this.canvas.width,
      targetHeight = this.canvas.height,
    } = options;

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }
    gl.viewport(0, 0, targetWidth, targetHeight);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVao);

    // 绑定原图到纹理单元 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.currentImageTexture);
    gl.uniform1i(this.imageTexUniform, 0);

    // 设置 LUT 纹理与相关 Uniforms
    if (lut) {
      const lutTex = this.getOrCreateLutTexture(lut);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, lutTex);
      gl.uniform1i(this.lutTexUniform, 1);

      gl.uniform1i(this.lutSizeUniform, lut.size);
      gl.uniform1f(this.hasLutUniform, 1.0);
    } else {
      gl.uniform1f(this.hasLutUniform, 0.0);
    }

    gl.uniform1f(this.intensityUniform, Math.max(0, Math.min(1, intensity)));
    gl.uniform1f(this.enableSplitUniform, enableSplit ? 1.0 : 0.0);
    gl.uniform1f(this.splitPositionUniform, Math.max(0, Math.min(1, splitPosition)));
    gl.uniform2f(this.resolutionUniform, targetWidth, targetHeight);

    // 绘制
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * 将当前 WebGL 渲染结果拷贝到目标 2D Canvas
   */
  public copyTo2DCanvas(target2dCanvas: HTMLCanvasElement): void {
    const ctx = target2dCanvas.getContext('2d');
    if (!ctx) return;
    if (target2dCanvas.width !== this.canvas.width || target2dCanvas.height !== this.canvas.height) {
      target2dCanvas.width = this.canvas.width;
      target2dCanvas.height = this.canvas.height;
    }
    ctx.drawImage(this.canvas, 0, 0);
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    const gl = this.gl;
    if (this.currentImageTexture) {
      gl.deleteTexture(this.currentImageTexture);
      this.currentImageTexture = null;
    }
    this.lutTextureCache.forEach(tex => gl.deleteTexture(tex));
    this.lutTextureCache.clear();
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.quadVao);
  }
}
