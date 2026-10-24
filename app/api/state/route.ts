import {db} from '../../../lib/db';
import {getProfile,getProgram} from '../../../lib/settings';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(){
  const exercises=db().prepare('SELECT day,exercise_id,done,weight,reps,notes FROM exercise_log ORDER BY day DESC').all();
  const days=db().prepare('SELECT day,calories,protein,walk_minutes,weight,waist,notes FROM daily_log ORDER BY day DESC').all();
  const sets=db().prepare('SELECT day,exercise_id,set_no,weight,reps,pain,notes FROM set_log ORDER BY day DESC,exercise_id,set_no').all();
  const sessions=db().prepare('SELECT day,general_note,confirmed_at,sent_at FROM session_log').all();
  const notes=db().prepare('SELECT id,day,author,body,created_at FROM trainer_notes ORDER BY id').all();
  const recommendations=db().prepare('SELECT exercise_id,weight,reps,note,author,created_at FROM recommendations').all();
  return Response.json({exercises,days,sets,sessions,notes,recommendations,profile:getProfile(),program:getProgram()});
}
