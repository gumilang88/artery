import { redirect } from "next/navigation";

export function generateStaticParams() {
  return [{ pair: "default" }];
}

export default async function Page({ params }: { params: Promise<{ pair: string }> }) {
  await params;
  redirect("/trade");
}
