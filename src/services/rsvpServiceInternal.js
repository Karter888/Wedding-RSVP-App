import { supabase } from './supabase'

export const invokeEdgeFunction = async (functionName, payload = {}) => {
  const { data, error } = await supabase.functions.invoke(functionName, { body: payload })
  if (error) throw error
  return data
}

export default invokeEdgeFunction
