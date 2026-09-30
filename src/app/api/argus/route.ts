import {NextRequest,NextResponse} from "next/server";
const SOURCE="https://argus.world/api/board";
export const revalidate=15;
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 const params=new URLSearchParams({filter:q.get("filter")||"new",sort:q.get("sort")||"lastTrade",direction:q.get("direction")||"desc",page:q.get("page")||"1",pageSize:"100"});
 try{
  const r=await fetch(`${SOURCE}?${params}`,{headers:{accept:"application/json","user-agent":"Artery-ARC-Market-Indexer/1.0"},next:{revalidate:15}});
  if(!r.ok) return NextResponse.json({error:`Argus upstream ${r.status}`},{status:502});
  const data=await r.json();
  return NextResponse.json(data,{headers:{"Cache-Control":"public, s-maxage=15, stale-while-revalidate=60"}});
 }catch{return NextResponse.json({error:"Argus upstream unavailable"},{status:502})}
}
