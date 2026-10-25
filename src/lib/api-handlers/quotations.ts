import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {VERIFY} from './auth';
import {isInstaller} from '@/lib/access';
import {QUOTATION_SCHEMA} from '@/lib/quotation-archive';
export async function GET(request:Request){
 const session=await VERIFY(request);if(!session.ok)return session;
 const {user}=await session.json();
 if(isInstaller(user))return NextResponse.json({success:false,message:'바론 직원만 견적서를 조회할 수 있습니다.'},{status:403});
 if(!db)return NextResponse.json({success:false,message:'데이터베이스에 연결하지 못했습니다.'},{status:503});
 try{
  await db.execute(QUOTATION_SCHEMA);
  const id=new URL(request.url).searchParams.get('id');
  if(id){
   const result=await db.execute({sql:'SELECT * FROM bo_quotations WHERE id=?',args:[id]});
   const row=result.rows[0];
   if(!row)return NextResponse.json({success:false,message:'견적서를 찾을 수 없습니다.'},{status:404});
   const {document_json,...metadata}=row;
   return NextResponse.json({success:true,data:{...metadata,document:JSON.parse(String(document_json))}},{headers:{'Cache-Control':'no-store'}});
  }
  const result=await db.execute('SELECT id,title,client_name,site_address,quote_date,installation_date,total,vat_included,created_at,created_by FROM bo_quotations ORDER BY created_at DESC LIMIT 1000');
  return NextResponse.json({success:true,data:result.rows},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({success:false,message:'견적서를 불러오지 못했습니다. 다시 시도해 주세요.'},{status:503});}
}
