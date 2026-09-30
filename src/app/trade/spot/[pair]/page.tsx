import { redirect } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ pair: string }> }) {
  await params;
  redirect("/trade");
}
