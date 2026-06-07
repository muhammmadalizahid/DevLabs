import { executeQueriesBatch } from '@/lib/engine/execute'
import { evaluateAnswer, evaluateAnswerPartial } from '@/lib/engine/evaluate'
import { validateQuery } from '@/lib/engine/query-validator'

function nowIso() {
  return new Date().toISOString()
}

export async function gradeSubmission(supabase, submissionId) {
  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    return { submission: null, error: submissionError?.message || 'Submission not found' }
  }

  const { data: answerRows, error: answersError } = await supabase
    .from('submission_answers')
    .select('id,question_id,query_text')
    .eq('submission_id', submissionId)

  if (answersError) return { submission, error: answersError.message }

  const questionIds = [...new Set((answerRows || []).map((answer) => answer.question_id).filter(Boolean))]
  const questionMap = new Map()

  if (questionIds.length > 0) {
    const { data: questionRows, error: questionsError } = await supabase
      .from('questions')
      .select('id,expected_output,dataset_id,order_sensitive,points')
      .in('id', questionIds)

    if (questionsError) return { submission, error: questionsError.message }
    for (const question of questionRows || []) questionMap.set(question.id, question)
  }

  let totalScore = 0
  const updates = []
  const executable = []

  for (const answer of answerRows || []) {
    const question = questionMap.get(answer.question_id)
    if (!question || !answer.query_text?.trim()) {
      updates.push({
        id: answer.id,
        is_correct: false,
        score: 0,
        actual_output: [],
        evaluated_at: nowIso(),
      })
      continue
    }

    const validation = validateQuery(answer.query_text)
    if (!validation.valid) {
      updates.push({
        id: answer.id,
        is_correct: false,
        score: 0,
        actual_output: [],
        evaluated_at: nowIso(),
      })
      continue
    }

    executable.push({
      key: answer.id,
      query: answer.query_text,
      datasetId: question.dataset_id,
      timeoutMs: parseInt(process.env.SUBMIT_QUERY_TIMEOUT_MS || '5000', 10),
      expected_output: question.expected_output,
      order_sensitive: question.order_sensitive,
      points: question.points ?? 1,
      partial_grading: false,
    })
  }

  let executionByAnswerId = new Map()
  if (executable.length > 0) {
    executionByAnswerId = await executeQueriesBatch(
      executable,
      parseInt(process.env.SUBMIT_QUERY_TIMEOUT_MS || '5000', 10)
    )
  }

  for (const task of executable) {
    const result = executionByAnswerId.get(task.key) || { rows: [], columns: [], error: 'Execution failed' }
    let evaluation
    let score = 0

    if (result.error) {
      evaluation = { isCorrect: false }
    } else if (process.env.ENABLE_PARTIAL_GRADING === '1' && task.partial_grading) {
      const partial = evaluateAnswerPartial(result.rows, task.expected_output, task.order_sensitive)
      evaluation = { isCorrect: partial.isCorrect }
      score = Math.round(((partial.percent ?? 0) / 100) * task.points)
    } else {
      evaluation = evaluateAnswer(result.rows, task.expected_output, task.order_sensitive)
      score = evaluation.isCorrect ? task.points : 0
    }

    totalScore += score
    updates.push({
      id: task.key,
      is_correct: evaluation.isCorrect,
      actual_output: result.rows || [],
      score,
      evaluated_at: nowIso(),
    })
  }

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('submission_answers')
      .update({
        is_correct: update.is_correct,
        actual_output: update.actual_output,
        score: update.score,
        evaluated_at: update.evaluated_at,
      })
      .eq('id', update.id)

    if (updateError) return { submission, error: updateError.message }
  }

  const { data: final, error: finalError } = await supabase
    .from('submissions')
    .update({
      total_score: totalScore,
      submitted_at: submission.submitted_at || nowIso(),
      status: 'submitted',
    })
    .eq('id', submissionId)
    .select()
    .single()

  if (finalError || !final) return { submission, error: finalError?.message || 'Failed to update submission score.' }

  return {
    submission: final,
    answersUpdated: updates.length,
    error: null,
  }
}
