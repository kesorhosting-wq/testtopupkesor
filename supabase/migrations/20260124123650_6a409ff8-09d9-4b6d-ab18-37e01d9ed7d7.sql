-- Create atomic wallet transaction function to prevent race conditions
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  _user_id UUID,
  _type TEXT,
  _amount NUMERIC,
  _description TEXT DEFAULT NULL,
  _reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_balance NUMERIC;
  _new_balance NUMERIC;
  _tx_id UUID;
BEGIN
  -- Lock the profile row for update to prevent race conditions
  SELECT wallet_balance INTO _current_balance
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;
  
  IF _current_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Calculate new balance
  _new_balance := _current_balance + _amount;
  
  -- For purchases (negative amounts), check sufficient balance
  IF _amount < 0 AND _new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Insert transaction record
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_before, balance_after, description, reference_id
  )
  VALUES (
    _user_id, _type, _amount, _current_balance, _new_balance, _description, _reference_id
  )
  RETURNING id INTO _tx_id;
  
  -- Update balance atomically
  UPDATE public.profiles
  SET wallet_balance = _new_balance, updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', _tx_id,
    'new_balance', _new_balance,
    'balance_before', _current_balance
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (will be called via service role from edge function)
GRANT EXECUTE ON FUNCTION public.process_wallet_transaction TO service_role;