import React, { useMemo, useState } from 'react'
import EmptyState from './EmptyState'

function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  pageSize = 10,
  emptyTitle = 'No rows found',
  onRowClick,
  renderExpanded,
}) {
  const [sortKey, setSortKey] = useState(columns[0]?.key || '')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(null)

  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey)
    if (!column || column.sortable === false) return rows
    return [...rows].sort((a, b) => {
      const aValue = column.sortValue ? column.sortValue(a) : a[sortKey]
      const bValue = column.sortValue ? column.sortValue(b) : b[sortKey]
      if (aValue === bValue) return 0
      const result = aValue > bValue ? 1 : -1
      return sortDir === 'asc' ? result : -result
    })
  }, [columns, rows, sortDir, sortKey])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  function toggleSort(column) {
    if (column.sortable === false) return
    if (sortKey === column.key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(column.key)
      setSortDir('asc')
    }
    setPage(1)
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} />
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${column.align === 'right' ? 'text-right' : 'text-left'} ${column.sortable === false ? '' : 'cursor-pointer select-none hover:text-slate-900'}`}
                  onClick={() => toggleSort(column)}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {sortKey === column.key && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedRows.map((row, index) => {
              const key = typeof rowKey === 'function' ? rowKey(row) : row[rowKey] || index
              const isExpanded = expanded === key
              return (
                <React.Fragment key={key}>
                  <tr
                    className={`transition hover:bg-slate-50 ${onRowClick || renderExpanded ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (renderExpanded) setExpanded(isExpanded ? null : key)
                      onRowClick?.(row)
                    }}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderExpanded && (
                    <tr>
                      <td colSpan={columns.length} className="bg-slate-50 px-4 py-4">
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Showing {sortedRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, sortedRows.length)} of {sortedRows.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={safePage === 1}
            className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-slate-500">{safePage} / {pageCount}</span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={safePage === pageCount}
            className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default DataTable
