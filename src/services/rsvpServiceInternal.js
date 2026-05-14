import { supabase } from './supabase'

export const invokeEdgeFunction = async (functionName, payload = {}) => {
  const { data, error } = await supabase.functions.invoke(functionName, { body: payload })
  if (error) {
    // Try to include useful details when available
    let msg = error.message || String(error)
    if (error.status) msg += ` (status: ${error.status})`
    if (error.body) {
      try {
        const parsed = typeof error.body === 'string' ? JSON.parse(error.body) : error.body
        msg += ` - ${JSON.stringify(parsed)}`
      } catch (e) {
        msg += ` - ${String(error.body).slice(0, 200)}`
      }
    }
    const enhanced = new Error(msg)
    enhanced.original = error
    throw enhanced
  }
  return data
}

export default invokeEdgeFunction
