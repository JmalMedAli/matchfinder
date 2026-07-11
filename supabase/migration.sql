-- ============================================================
-- MATCHFINDER DATABASE MIGRATION V2 (FIXED)
-- Development Version
-- ============================================================


-- ============================================================
-- DROP EXISTING APP TABLES
-- ============================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;


-- ============================================================
-- REMOVE OLD AUTH TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  image text,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- Restore profiles for existing auth users

INSERT INTO public.profiles (id, email)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO NOTHING;



-- ============================================================
-- MATCHES
-- ============================================================

CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title text NOT NULL,
  description text,

  date timestamptz NOT NULL,

  location text NOT NULL,

  max_players integer NOT NULL
  CHECK (max_players >= 2 AND max_players <= 100),

  status text NOT NULL DEFAULT 'OPEN'
  CHECK (
    status IN (
      'OPEN',
      'FULL',
      'CLOSED',
      'COMPLETED'
    )
  ),

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now(),

  organizer_id uuid NOT NULL
  REFERENCES profiles(id)
  ON DELETE CASCADE
);



CREATE INDEX idx_matches_status_date
ON matches(status,date);


CREATE INDEX idx_matches_organizer
ON matches(organizer_id);



-- ============================================================
-- JOIN REQUESTS
-- ============================================================


CREATE TABLE join_requests (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  status text NOT NULL DEFAULT 'PENDING'
  CHECK (
    status IN(
      'PENDING',
      'ACCEPTED',
      'REJECTED'
    )
  ),


  message text,


  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now(),


  match_id uuid NOT NULL
  REFERENCES matches(id)
  ON DELETE CASCADE,


  player_id uuid NOT NULL
  REFERENCES profiles(id)
  ON DELETE CASCADE,


  UNIQUE(match_id,player_id)

);



CREATE INDEX idx_join_player_status
ON join_requests(player_id,status);


CREATE INDEX idx_join_match_status
ON join_requests(match_id,status);





-- ============================================================
-- NOTIFICATIONS
-- ============================================================


CREATE TABLE notifications (

 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

 title text NOT NULL,

 message text NOT NULL,

 read boolean NOT NULL DEFAULT false,

 created_at timestamptz NOT NULL DEFAULT now(),


 user_id uuid NOT NULL
 REFERENCES profiles(id)
 ON DELETE CASCADE

);



CREATE INDEX idx_notifications_user_read
ON notifications(user_id,read);





-- ============================================================
-- AUTO CREATE PROFILE FUNCTION
-- ============================================================


CREATE OR REPLACE FUNCTION handle_new_user()

RETURNS trigger AS $$

BEGIN


INSERT INTO public.profiles
(
 id,
 name,
 email,
 image
)

VALUES
(
 new.id,

 new.raw_user_meta_data->>'name',

 new.email,

 COALESCE(
 new.raw_user_meta_data->>'avatar_url',
 new.raw_user_meta_data->>'picture'
 )

)

ON CONFLICT(id)
DO NOTHING;


RETURN new;


END;

$$ LANGUAGE plpgsql SECURITY DEFINER;




CREATE TRIGGER on_auth_user_created

AFTER INSERT ON auth.users

FOR EACH ROW

EXECUTE FUNCTION handle_new_user();





-- ============================================================
-- UPDATED_AT FUNCTION
-- ============================================================


CREATE OR REPLACE FUNCTION update_updated_at()

RETURNS trigger AS $$

BEGIN

NEW.updated_at = now();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;





CREATE TRIGGER matches_updated_at

BEFORE UPDATE ON matches

FOR EACH ROW

EXECUTE FUNCTION update_updated_at();




CREATE TRIGGER join_requests_updated_at

BEFORE UPDATE ON join_requests

FOR EACH ROW

EXECUTE FUNCTION update_updated_at();





-- ============================================================
-- ACCEPT JOIN REQUEST FUNCTION
-- ============================================================


CREATE OR REPLACE FUNCTION accept_join_request
(
 p_join_request_id uuid,

 p_organizer_id uuid

)

RETURNS boolean AS $$


DECLARE

v_match_id uuid;

v_status text;

v_max_players integer;

v_count integer;


BEGIN


SELECT match_id
INTO v_match_id

FROM join_requests

WHERE id=p_join_request_id

AND status='PENDING'

FOR UPDATE;



IF v_match_id IS NULL THEN

RETURN false;

END IF;



SELECT status,max_players

INTO v_status,v_max_players

FROM matches

WHERE id=v_match_id

AND organizer_id=p_organizer_id

FOR UPDATE;



IF v_status IS NULL
OR v_status!='OPEN'

THEN

RETURN false;

END IF;



SELECT COUNT(*)

INTO v_count

FROM join_requests

WHERE match_id=v_match_id

AND status='ACCEPTED';



IF v_count >= v_max_players THEN

RETURN false;

END IF;




UPDATE join_requests

SET status='ACCEPTED'

WHERE id=p_join_request_id;



IF v_count + 1 >= v_max_players THEN


UPDATE matches

SET status='FULL'

WHERE id=v_match_id;


END IF;



RETURN true;


END;

$$ LANGUAGE plpgsql SECURITY DEFINER;






-- ============================================================
-- RLS ENABLE
-- ============================================================


ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;





-- ============================================================
-- PROFILES POLICIES
-- ============================================================


CREATE POLICY "Authenticated view profiles"

ON profiles

FOR SELECT

TO authenticated

USING(true);



CREATE POLICY "Update own profile"

ON profiles

FOR UPDATE

TO authenticated

USING(auth.uid()=id);






-- ============================================================
-- MATCH POLICIES
-- ============================================================


CREATE POLICY "View matches"

ON matches

FOR SELECT

TO authenticated

USING(true);




CREATE POLICY "Create matches"

ON matches

FOR INSERT

TO authenticated

WITH CHECK(auth.uid()=organizer_id);




CREATE POLICY "Update own matches"

ON matches

FOR UPDATE

TO authenticated

USING(auth.uid()=organizer_id);



CREATE POLICY "Delete own matches"

ON matches

FOR DELETE

TO authenticated

USING(auth.uid()=organizer_id);







-- ============================================================
-- JOIN REQUEST POLICIES
-- ============================================================


CREATE POLICY "View join requests"

ON join_requests

FOR SELECT

TO authenticated

USING(

auth.uid()=player_id

OR

auth.uid() IN
(
SELECT organizer_id
FROM matches
WHERE matches.id=join_requests.match_id
)

);




CREATE POLICY "Create join requests"

ON join_requests

FOR INSERT

TO authenticated

WITH CHECK(auth.uid()=player_id);




CREATE POLICY "Update join requests"

ON join_requests

FOR UPDATE

TO authenticated

USING(

auth.uid() IN
(
SELECT organizer_id
FROM matches
WHERE matches.id=join_requests.match_id
)

);







-- ============================================================
-- NOTIFICATION POLICIES
-- ============================================================


CREATE POLICY "View own notifications"

ON notifications

FOR SELECT

TO authenticated

USING(auth.uid()=user_id);



CREATE POLICY "Create own notifications"

ON notifications

FOR INSERT

TO authenticated

WITH CHECK(auth.uid()=user_id);



CREATE POLICY "Update own notifications"

ON notifications

FOR UPDATE

TO authenticated

USING(auth.uid()=user_id);




-- ============================================================
-- END
-- ============================================================
