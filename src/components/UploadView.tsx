import React, { useRef, useState } from 'react';
import { Upload, FileCode2, Image as ImageIcon, ShieldCheck, Cpu } from 'lucide-react';

interface UploadViewProps {
  onImageSelected: (file: File) => void;
  onLutsSelected: (files: File[]) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onImageSelected,
  onLutsSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // 区分图片和 .cube 文件
    const imageFiles = files.filter(f => /\.(jpe?g|png|webp)$/i.test(f.name));
    const cubeFiles = files.filter(f => /\.cube$/i.test(f.name));

    if (imageFiles.length > 0) {
      onImageSelected(imageFiles[0]);
    }
    if (cubeFiles.length > 0) {
      onLutsSelected(cubeFiles);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  const handleLutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onLutsSelected(files);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0d0f12] text-slate-100">
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        {/* 顶部标题 */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-sky-400 mb-6 font-medium tracking-wide">
          <Cpu className="w-3.5 h-3.5" />
          WebGL2 3D 纹理硬件级渲染 · 纯本地私密处理
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
          LogLook · LUT 对比器
        </h1>

        <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mb-8">
          专为 iPhone Apple Log 拍摄设计的纯前端对比工具。一屏并列预览多个 .cube 调色滤镜效果，支持实时分割对比与全分辨率无损导出。
        </p>

        {/* 拖拽或点击主上传区域 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => imageInputRef.current?.click()}
          className={`w-full p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center bg-[#16191f]/80 backdrop-blur-sm group ${
            isDragging
              ? 'border-sky-500 bg-sky-950/20 scale-[1.01]'
              : 'border-slate-700/80 hover:border-slate-500 hover:bg-[#1a1f26]'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-5 text-sky-400 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            点击或拖拽上传 Apple Log 原图
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">
            支持 JPG、PNG、WebP。Apple Log 原图较灰属正常现象，系统不做任何自动校正。支持同时拖入 .cube 文件。
          </p>

          <button
            type="button"
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-900/20 flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            选择原图文件
          </button>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {/* 补充：提前多选上传 LUT 的辅助按钮 */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => lutInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs sm:text-sm transition-colors flex items-center gap-2"
          >
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            或提前多选导入 .cube LUT 文件
          </button>
          <input
            ref={lutInputRef}
            type="file"
            accept=".cube"
            multiple
            className="hidden"
            onChange={handleLutChange}
          />
        </div>

        {/* 底部特性说明 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-12 w-full text-left">
          <div className="p-4 rounded-xl bg-[#16191f]/60 border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% 纯本地运行
            </div>
            <div className="text-[11px] text-slate-500">
              无后端无服务器上传，照片与 LUT 绝不离开浏览器，离线断网可用
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#16191f]/60 border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              硬件三线性插值
            </div>
            <div className="text-[11px] text-slate-500">
              采用 WebGL2 3D Texture 原生插值，无 CPU 逐像素循环，60fps 实时渲染
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#16191f]/60 border border-slate-800/80 col-span-2 sm:col-span-1">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              全分辨率导出
            </div>
            <div className="text-[11px] text-slate-500">
              预览缩放加速，导出时以相机原始像素精度重新渲染输出 PNG
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
