import {useState, useEffect} from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRealtimeBasketballScores(matchId: string) {
  const [scores, setScores] = useState<any[]>([]);
  const [matchScores, setMatchScores] = useState({teamA :0, teamB:0});
  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');

  useEffect(() => {
    const fetchScores =  async () => {
      const {data} = await supabase
      .from("basketball_scores")
      .select('*')
      .eq('match_id', matchId);

      if (data) setScores(data);
    };

    const fetchMatchScores = async () => {
      const {data} = await supabase
        .from('matches')
        .select('team_a_score, team_b_score, team_a_id, team_b_id')
        .eq('id', matchId)
        .single();
      
      if (data) {
        setMatchScores({
          teamA: data.team_a_score || 0,
          teamB: data.team_b_score || 0,
        });
        setTeamAId(data.team_a_id?.toString() || '');
        setTeamBId(data.team_b_id?.toString() || '');
      }
    };

    fetchScores();
    fetchMatchScores();

    const scoresChannel = supabase 
      .channel(`basketball_scores:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'basketball_scores',
          filter:  `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log("Realtime update received", payload);

          if(payload.eventType === 'INSERT'){
            setScores((prev)=> [...prev, payload.new])
          }
          else if(payload.eventType === 'UPDATE'){
            setScores((prev)=> 
              prev.map((score) => 
                score.player_id === payload.new.player_id &&
                score.team_id === payload.new.team_id ? payload.new: score
              )
            )
          }
          else if(payload.eventType === 'DELETE'){
            setScores((prev)=> 
              prev.filter(
                (score) => 
                  !(score.player_id === payload.old.player_id && 
                    score.team_id === payload.old.team_id
                  )
              )
            )
          }
           
        }
      ).subscribe();

      const matchChannel = supabase 
        .channel(`matches:${matchId}`)
        .on(
          "postgres_changes",
          {
            event: 'UPDATE',
            schema: 'public',
            table : 'matches', 
            filter:  `id=eq.${matchId}`
          },
          (payload) => {
            console.log("Update Received", payload);

            setMatchScores({
              teamA: payload.new.team_a_score || 0,
              teamB: payload.new.team_b_score || 0,
            })

          }
        ).subscribe()

        return () => {
          supabase.removeChannel(scoresChannel);
          supabase.removeChannel(matchChannel);


        };

  }, [matchId])

  return {scores, matchScores, teamAId, teamBId, setScores, setMatchScores}
}