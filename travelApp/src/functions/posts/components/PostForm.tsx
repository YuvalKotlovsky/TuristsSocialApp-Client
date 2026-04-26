import type { Post } from "@/types";
import { useState, useRef } from "react";

export type PostFormValues = {
  content: string;
  location: string;
  imageFile: File | null;
  image?: string;
};

type PostFormProps = {
  mode: "create" | "edit";
  initialValues?: Post;
  onSubmit: (values: PostFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitText?: string;
};

export default function PostForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitText,
}: PostFormProps) {
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [image, setImage] = useState<string | undefined>(initialValues?.image);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    setImageFile(file);

    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    // remove preview (for create it means no image; for edit it means "no preview")
    setImage(undefined);
    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ content, location, imageFile, image });
  };

  const defaultSubmitText = mode === "create" ? "Create Post" : "Save Changes";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">
        {mode === "create" ? "Create New Post" : "Edit Post"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded shadow"
      >
        <div className="mb-4">
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Write something..."
            rows={5}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="location" className="block text-sm font-medium mb-1">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Enter location"
          />
        </div>

        {/*Preview (existing URL or new base64) */}
        {image && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">
              {mode === "edit"
                ? "Current / New Image Preview"
                : "Image Preview"}
            </p>

            <div className="relative rounded border border-gray-200 overflow-hidden">
              <img
                src={image}
                alt="Preview"
                className="w-full h-auto max-h-64 object-cover"
              />

              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-white/90 border border-gray-200 rounded px-2 py-1 text-xs hover:bg-white"
              >
                Remove
              </button>
            </div>

            {mode === "edit" && (
              <p className="mt-2 text-xs text-gray-500">
                Upload a new image to replace it.
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="image" className="block text-sm font-medium mb-1">
            {mode === "create" ? "Upload Image" : "Replace Image (optional)"}
          </label>
          <input
            ref={fileInputRef}
            id="image"
            type="file"
            onChange={handleFileChange}
            className="w-full border border-gray-300 rounded p-2"
            accept="image/*"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : submitText ?? defaultSubmitText}
          </button>
        </div>
      </form>
    </div>
  );
}
