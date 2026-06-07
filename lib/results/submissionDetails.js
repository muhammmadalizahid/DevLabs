export async function getDetailedSubmissionsForTest(supabase, testId, { status } = {}) {
  let submissionQuery = supabase
    .from('submissions')
    .select('*')
    .eq('test_id', testId)
    .order('total_score', { ascending: false })
    .order('submitted_at', { ascending: false })

  if (status) submissionQuery = submissionQuery.eq('status', status)

  const { data: submissions, error: submissionsError } = await submissionQuery
  if (submissionsError) throw new Error(submissionsError.message)

  const submissionRows = submissions || []
  if (submissionRows.length === 0) return []

  const userIds = [...new Set(submissionRows.map((submission) => submission.student_id).filter(Boolean))]
  const submissionIds = submissionRows.map((submission) => submission.id)

  const userMap = new Map()
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,name,email,avatar_url')
      .in('id', userIds)
    if (usersError) throw new Error(usersError.message)
    for (const user of users || []) userMap.set(user.id, user)
  }

  const { data: answers, error: answersError } = await supabase
    .from('submission_answers')
    .select('id,submission_id,question_id,query_text,actual_output,is_correct,score,evaluated_at')
    .in('submission_id', submissionIds)
  if (answersError) throw new Error(answersError.message)

  const questionIds = [...new Set((answers || []).map((answer) => answer.question_id).filter(Boolean))]
  const questionMap = new Map()
  if (questionIds.length > 0) {
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id,prompt,points,expected_output,position')
      .in('id', questionIds)
    if (questionsError) throw new Error(questionsError.message)
    for (const question of questions || []) {
      questionMap.set(question.id, { ...question, partial_grading: false })
    }
  }

  const answersBySubmission = new Map()
  for (const answer of answers || []) {
    const list = answersBySubmission.get(answer.submission_id) || []
    list.push({
      ...answer,
      questions: questionMap.get(answer.question_id) || null,
    })
    answersBySubmission.set(answer.submission_id, list)
  }

  return submissionRows.map((submission) => ({
    ...submission,
    users: userMap.get(submission.student_id) || null,
    submission_answers: (answersBySubmission.get(submission.id) || []).sort((a, b) => {
      const aPos = a.questions?.position ?? Number.MAX_SAFE_INTEGER
      const bPos = b.questions?.position ?? Number.MAX_SAFE_INTEGER
      return aPos - bPos
    }),
  }))
}
