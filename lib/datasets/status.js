export function normalizeDatasetStatus(dataset) {
  const status = dataset?.status || 'READY'
  if (status !== 'PROCESSING') return status
  if (dataset?.table_count > 0 || dataset?.row_count > 0) return 'READY'
  if (dataset?.is_platform) return 'READY'
  return status
}

export async function getDatasetReadiness(supabase, datasetId) {
  const { data: dataset, error } = await supabase
    .from('datasets')
    .select('id,status,is_platform,table_count,row_count')
    .eq('id', datasetId)
    .single()

  if (error || !dataset) {
    return {
      dataset: null,
      status: null,
      ready: false,
      error: 'Dataset not found',
    }
  }

  let status = normalizeDatasetStatus(dataset)

  // Some older/imported datasets can have usable TiDB metadata while the parent
  // row is still stuck in PROCESSING. Treat table metadata as the source of truth
  // for execution readiness, then lazily repair the parent status for future reads.
  if (status === 'PROCESSING') {
    const { count } = await supabase
      .from('dataset_tables')
      .select('id', { count: 'exact', head: true })
      .eq('dataset_id', datasetId)

    if ((count || 0) > 0) {
      status = 'READY'
      await supabase
        .from('datasets')
        .update({ status: 'READY', error_message: null })
        .eq('id', datasetId)
    }
  }

  if (status && status !== 'READY') {
    return {
      dataset: { ...dataset, status },
      status,
      ready: false,
      error: `Dataset is not ready (${status}).`,
    }
  }

  return {
    dataset: { ...dataset, status },
    status,
    ready: true,
    error: null,
  }
}
