'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAuditLogs, type AuditLog } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'

interface AuditLogWithUser extends AuditLog {
  users?: {
    username: string
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLogWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [userList, setUserList] = useState<Array<{ id: string; username: string }>>([])
  const [userFilter, setUserFilter] = useState<string>('all')

  useEffect(() => {
    fetchAuditLogs()
    fetchUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [logs, searchTerm, actionFilter, entityTypeFilter, startDate, endDate, userFilter])

  const fetchUsers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username', { ascending: true })

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      setUserList((data || []) as Array<{ id: string; username: string }>)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true)
      const data = await getAuditLogs({ limit: 1000 })
      setLogs(data as AuditLogWithUser[])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(searchLower) ||
        log.entity_type?.toLowerCase().includes(searchLower) ||
        log.entity_id?.toLowerCase().includes(searchLower) ||
        log.details?.toLowerCase().includes(searchLower) ||
        log.users?.username?.toLowerCase().includes(searchLower)
      )
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    // Entity type filter
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityTypeFilter)
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(log => log.user_id === userFilter)
    }

    // Date filter
    if (startDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.created_at)
        const start = new Date(startDate)
        return logDate >= start
      })
    }
    if (endDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.created_at)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return logDate <= end
      })
    }

    setFilteredLogs(filtered)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) {
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
    }
    if (action.includes('update') || action.includes('edit')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
    }
    if (action.includes('delete') || action.includes('remove')) {
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort()
  const uniqueEntityTypes = Array.from(new Set(logs.map(log => log.entity_type))).sort()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Audit Log</h1>
            <p className="text-muted-foreground">View system activity and changes</p>
          </div>
          <Button
            onClick={() => fetchAuditLogs()}
            disabled={isLoading}
            variant="outline"
            className="h-9 text-sm"
          >
            {isLoading ? '🔄' : '↻'} Refresh
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="p-4 mb-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Log Entries</p>
              <p className="text-xl font-bold text-foreground">{filteredLogs.length}</p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-4 mb-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary text-lg">🔍</span>
            <h2 className="text-base font-semibold text-foreground">Filters</h2>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Search</label>
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Entity Type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Types</option>
                {uniqueEntityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-foreground mb-1 block">User</label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Users</option>
                {userList.map(user => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="text-xs font-medium text-foreground mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setActionFilter('all')
                  setEntityTypeFilter('all')
                  setUserFilter('all')
                  setStartDate('')
                  setEndDate('')
                }}
                className="h-9 text-sm px-4"
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Audit Log Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No audit logs found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {logs.length === 0 
                    ? 'No audit logs have been recorded yet'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Date & Time</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">User</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Action</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Entity Type</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Entity ID</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Details</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="py-4 px-4 text-foreground text-sm">{formatDate(log.created_at)}</td>
                        <td className="py-4 px-4 text-foreground">
                          {log.users?.username || log.user_id || 'System'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-foreground">{log.entity_type}</td>
                        <td className="py-4 px-4 text-foreground text-sm">{log.entity_id || '-'}</td>
                        <td className="py-4 px-4 text-foreground text-sm max-w-md truncate" title={log.details || ''}>
                          {log.details || '-'}
                        </td>
                        <td className="py-4 px-4 text-foreground text-sm">{log.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
