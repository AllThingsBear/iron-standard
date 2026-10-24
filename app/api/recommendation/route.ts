import {db} from '../../../lib/db';
export const runtime='nodejs';
// Trainer/human weight picks. They only influence suggestions shown in the app; they never change logged history.
export async function POST(req:Request){
 try{const {exercise_id,weight,reps,note,author}=await req.json();
 const id=String(exercise_id||'').slice(0,80);
 if(!id)return Response.json({error:'exercise_id is required'},{status:400});
 const w=weight===''||weight==null?null:Number(weight);
 if(w!==null&&(!Number.isFinite(w)||w<0||w>1500))return Response.json({error:'Invalid weight'},{status:400});
 db().prepare(`INSERT INTO recommendations(exercise_id,weight,reps,note,author) VALUES(?,?,?,?,?) ON CONFLICT(exercise_id) DO UPDATE SET weight=excluded.weight,reps=excluded.reps,note=excluded.note,author=excluded.author,created_at=CURRENT_TIMESTAMP`)
  .run(id,w,String(reps||'').slice(0,60),String(note||'').slice(0,600),String(author||'Trainer').slice(0,80));
 return Response.json({ok:true});}catch{return Response.json({error:'Invalid request'},{status:400});}
}
export async function DELETE(req:Request){
 try{const {exercise_id}=await req.json();db().prepare('DELETE FROM recommendations WHERE exercise_id=?').run(String(exercise_id||''));return Response.json({ok:true});}
 catch{return Response.json({error:'Invalid request'},{status:400});}
}
