import React from "react";
import { TextCubeLoader } from "@/components/effects/TextCubeLoader";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
      <TextCubeLoader subtitle="Kinakarga ang PESO EC Access Portal..." />
    </div>
  );
}
