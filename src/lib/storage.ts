import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

export type PublicImageBucket = "avatars" | "market-images" | "store-images";
export type SelectedImage = { uri: string; base64: string; extension: "jpg" | "png" | "webp"; mimeType: string };

const allowedMimeTypes: Record<string, SelectedImage["extension"]> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function selectSquareImage(): Promise<SelectedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? "image/jpeg";
  const extension = allowedMimeTypes[mimeType];
  if (!asset.base64 || !extension) throw new Error("รองรับเฉพาะไฟล์ JPG, PNG และ WebP");
  return { uri: asset.uri, base64: asset.base64, extension, mimeType };
}

export async function uploadPublicImage(
  bucket: PublicImageBucket,
  ownerFolder: string | number,
  image: SelectedImage,
  prefix = "cover",
) {
  const path = `${ownerFolder}/${prefix}-${Date.now()}.${image.extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, decode(image.base64), {
    contentType: image.mimeType,
    upsert: false,
  });
  if (error) throw error;
  return { path, publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

export function ownObjectPathFromPublicUrl(bucket: PublicImageBucket, publicUrl: string, ownerFolder: string) {
  const marker = `/object/public/${bucket}/`;
  const path = decodeURIComponent(publicUrl.split(marker)[1] ?? "");
  return path.startsWith(`${ownerFolder}/`) ? path : null;
}
