import { Camera } from "lucide-react";
import { DemoExampleId, demoExamples } from "../lib/demoExamples";

export default function DemoSamplePhoto({ exampleId }: { exampleId: DemoExampleId }) {
  const caption = demoExamples[exampleId].caption;
  return <figure className="overflow-hidden rounded-lg border">
    <img src={'/demo-samples/' + exampleId + '.webp'} alt={caption} className="h-24 w-full object-cover sm:h-52"/>
    <figcaption className="flex items-center gap-2 px-2 py-1.5 text-xs sm:p-3 sm:text-sm"><Camera size={15}/>{caption}</figcaption>
  </figure>;
}
