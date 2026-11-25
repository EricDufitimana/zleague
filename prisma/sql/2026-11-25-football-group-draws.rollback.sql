BEGIN;
CREATE OR REPLACE FUNCTION public.finalize_boys_groups(p_championship bigint, p_sport public.sport_type,
  p_seeds bigint[], p_snapshot jsonb) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE final_id bigint; current_snapshot jsonb;
BEGIN
  PERFORM id FROM championships WHERE id=p_championship AND status='ongoing' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an ongoing championship.'; END IF;
  PERFORM id FROM tournament_groups WHERE championship_id=p_championship AND sport_type=p_sport FOR UPDATE;
  IF (SELECT count(*) FROM tournament_groups WHERE championship_id=p_championship AND sport_type=p_sport AND NOT finalized) <> 2
    THEN RAISE EXCEPTION 'The group stage is missing or already finalized.'; END IF;
  PERFORM m.id FROM matches m JOIN tournament_groups g ON g.id=m.group_id
    WHERE g.championship_id=p_championship AND g.sport_type=p_sport FOR UPDATE OF m;
  SELECT jsonb_agg(jsonb_build_object('id',m.id,'status',m.status,'winner_id',m.winner_id,
    'team_a_score',m.team_a_score,'team_b_score',m.team_b_score) ORDER BY m.id) INTO current_snapshot
    FROM matches m JOIN tournament_groups g ON g.id=m.group_id WHERE g.championship_id=p_championship AND g.sport_type=p_sport;
  IF current_snapshot IS DISTINCT FROM p_snapshot OR jsonb_array_length(current_snapshot) <> 6 OR
    EXISTS (SELECT 1 FROM matches m JOIN tournament_groups g ON g.id=m.group_id WHERE g.championship_id=p_championship
      AND g.sport_type=p_sport AND (m.status <> 'played' OR m.winner_id IS NULL))
    THEN RAISE EXCEPTION 'Results changed or are incomplete. Refresh the standings before finalizing.'; END IF;
  IF array_length(p_seeds,1) IS DISTINCT FROM 4 OR (SELECT count(DISTINCT x) FROM unnest(p_seeds) x) <> 4 OR
    (SELECT count(*) FROM tournament_group_teams t JOIN tournament_groups g ON g.id=t.group_id
      WHERE g.championship_id=p_championship AND g.sport_type=p_sport AND
        ((g.name='A' AND t.team_id=ANY(ARRAY[p_seeds[1],p_seeds[4]])) OR
         (g.name='B' AND t.team_id=ANY(ARRAY[p_seeds[2],p_seeds[3]])))) <> 4
    THEN RAISE EXCEPTION 'Invalid semifinal seeds.'; END IF;
  INSERT INTO matches(championship_id,sport_type,gender,boys_stage_groups,status)
    VALUES(p_championship,p_sport,'male','finals','not_yet_scheduled') RETURNING id INTO final_id;
  INSERT INTO matches(championship_id,sport_type,gender,boys_stage_groups,status,team_a_id,team_b_id,next_match_id)
    VALUES(p_championship,p_sport,'male','semi-finals','not_yet_scheduled',p_seeds[1],p_seeds[2],final_id),
          (p_championship,p_sport,'male','semi-finals','not_yet_scheduled',p_seeds[3],p_seeds[4],final_id);
  UPDATE tournament_groups g SET finalized=true,
    qualification_order=CASE WHEN name='A' THEN ARRAY[p_seeds[1],p_seeds[4]] ELSE ARRAY[p_seeds[3],p_seeds[2]] END ||
      ARRAY(SELECT team_id FROM tournament_group_teams WHERE group_id=g.id AND NOT team_id=ANY(p_seeds))
    WHERE championship_id=p_championship AND sport_type=p_sport;
END $$;

COMMIT;
