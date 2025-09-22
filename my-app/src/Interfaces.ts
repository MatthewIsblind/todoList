export interface ITask {
    id: number;
    description: string;
    date: string; // format: YYYY-MM-DD
    time: string; // format: HH:MM
}
 
export interface TaskResponse{
  id: number;
  description: string;
  date: string;
  time: string;
  user_email: string | null;
};