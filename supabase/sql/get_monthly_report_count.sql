-- Supabase SQL Editor 또는 마이그레이션으로 적용하세요.
-- 서비스 롤/인증 클라이언트에서 rpc('get_monthly_report_count', { p_user_id }) 호출.

CREATE OR REPLACE FUNCTION public.get_monthly_report_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.cdss_guardrail_logs AS c
  INNER JOIN public.patients AS p ON p.id = c.patient_id
  WHERE p.created_by = p_user_id
    AND c.created_at >= (
      (date_trunc('month', timezone('Asia/Seoul', now()))) AT TIME ZONE 'Asia/Seoul'
    )
    AND c.created_at < (
      (date_trunc('month', timezone('Asia/Seoul', now())) + interval '1 month') AT TIME ZONE 'Asia/Seoul'
    );
$$;

REVOKE ALL ON FUNCTION public.get_monthly_report_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_report_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_monthly_report_count(uuid) TO authenticated;
