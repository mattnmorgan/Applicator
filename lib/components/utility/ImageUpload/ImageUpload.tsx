"use client";

import React, { useRef } from "react";

export interface ImageUploadProps {
  /** Current preview URL (either an existing image URL or a newly selected data URL) */
  value?: string | null;
  /** Called with the base64 data URL when a new image is selected, or null when cleared */
  onChange: (dataUrl: string | null) => void;
  /** Label shown above the upload area */
  label?: string;
  /** Size of the preview image in pixels (width and height). Defaults to 64 */
  previewSize?: number;
  /** Border radius of the preview image. Defaults to 10 */
  previewRadius?: number;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  previewSize = 64,
  previewRadius = 10,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div>
      {label && (
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{label}</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {value ? (
          <img
            src={value}
            alt="Preview"
            style={{
              width: previewSize,
              height: previewSize,
              borderRadius: previewRadius,
              objectFit: "cover",
              border: "1px solid #334155",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: previewSize,
              height: previewSize,
              borderRadius: previewRadius,
              background: "#1e293b",
              border: "1px solid #334155",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "#475569",
            }}
          >
            None
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              padding: "5px 12px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Choose Image
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              style={{
                padding: "5px 10px",
                background: "transparent",
                border: "1px solid #334155",
                borderRadius: 6,
                color: "#94a3b8",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
