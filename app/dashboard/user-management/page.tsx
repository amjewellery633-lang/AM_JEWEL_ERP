'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getUsers, createUser, updateUser, deleteUser, type User } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    staff_code: '',
    role: 'staff',
    can_edit_bills: true,
    can_edit_stock: false,
    can_authorize_nongst: false,
    twofa_enabled: false,
    phone: '',
    email: '',
  })
  
  const [password, setPassword] = useState('')
  const [editPassword, setEditPassword] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.username || !password) {
      toast({
        title: 'Required Fields',
        description: 'Username and password are required',
        variant: 'destructive',
      })
      return
    }

    try {
      // Note: In production, password should be hashed using bcrypt
      // For now, storing as plain text (matching current login implementation)
      const userData = {
        username: newUser.username,
        staff_code: newUser.staff_code || undefined,
        role: newUser.role || 'staff',
        password_hash: password,
        can_edit_bills: newUser.can_edit_bills ?? true,
        can_edit_stock: newUser.can_edit_stock ?? false,
        can_authorize_nongst: newUser.can_authorize_nongst ?? false,
        twofa_enabled: newUser.twofa_enabled ?? false,
        phone: newUser.phone || undefined,
        email: newUser.email || undefined,
      } as any
      
      await createUser(userData)
      await fetchUsers()
      setNewUser({
        username: '',
        staff_code: '',
        role: 'staff',
        can_edit_bills: true,
        can_edit_stock: false,
        can_authorize_nongst: false,
        twofa_enabled: false,
        phone: '',
        email: '',
      })
      setPassword('')
      setShowAddForm(false)
      toast({
        title: 'Success',
        description: 'User created successfully',
      })
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const updates: any = {
        username: editingUser.username,
        staff_code: editingUser.staff_code || undefined,
        role: editingUser.role,
        can_edit_bills: editingUser.can_edit_bills,
        can_edit_stock: editingUser.can_edit_stock,
        can_authorize_nongst: editingUser.can_authorize_nongst,
        twofa_enabled: editingUser.twofa_enabled,
        phone: editingUser.phone || undefined,
        email: editingUser.email || undefined,
      }
      
      // Only update password if a new one is provided
      if (editPassword) {
        updates.password_hash = editPassword // In production, hash this
      }
      
      await updateUser(editingUser.id, updates)
      await fetchUsers()
      setEditingUser(null)
      setEditPassword('')
      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      await deleteUser(userToDelete)
      await fetchUsers()
      setShowDeleteDialog(false)
      setUserToDelete(null)
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.staff_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage system users and permissions</p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Add User
          </Button>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <Input
            placeholder="Search by username, staff code, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </Card>

        {/* Users Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Username</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Staff Code</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Role</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Email</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Phone</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Permissions</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">2FA</th>
                      <th className="text-center py-4 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="py-4 px-4 font-medium text-foreground">{user.username}</td>
                        <td className="py-4 px-4 text-foreground">{user.staff_code || '-'}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : user.role === 'staff'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}
                          >
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-foreground">{user.email || '-'}</td>
                        <td className="py-4 px-4 text-foreground">{user.phone || '-'}</td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.can_edit_bills && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded">
                                Bills
                              </span>
                            )}
                            {user.can_edit_stock && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded">
                                Stock
                              </span>
                            )}
                            {user.can_authorize_nongst && (
                              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 rounded">
                                Non-GST
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {user.twofa_enabled ? (
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                              className="h-8 text-xs"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user.id)
                                setShowDeleteDialog(true)
                              }}
                              className="h-8 text-xs"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Username *</label>
                  <Input
                    value={newUser.username || ''}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Username"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Password *</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Staff Code</label>
                  <Input
                    value={newUser.staff_code || ''}
                    onChange={(e) => setNewUser({ ...newUser, staff_code: e.target.value })}
                    placeholder="Staff Code"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Role *</label>
                  <select
                    value={newUser.role || 'staff'}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'staff' | 'read_only' })}
                    className="w-full h-10 px-3 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="read_only">Read Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input
                    type="email"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone</label>
                  <Input
                    type="tel"
                    value={newUser.phone || ''}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newUser.can_edit_bills || false}
                      onChange={(e) => setNewUser({ ...newUser, can_edit_bills: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Can Edit Bills</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newUser.can_edit_stock || false}
                      onChange={(e) => setNewUser({ ...newUser, can_edit_stock: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Can Edit Stock</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newUser.can_authorize_nongst || false}
                      onChange={(e) => setNewUser({ ...newUser, can_authorize_nongst: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Can Authorize Non-GST</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newUser.twofa_enabled || false}
                      onChange={(e) => setNewUser({ ...newUser, twofa_enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">2FA Enabled</span>
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Username</label>
                    <Input
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Staff Code</label>
                    <Input
                      value={editingUser.staff_code || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, staff_code: e.target.value })}
                      placeholder="Staff Code"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Role</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'staff' | 'read_only' })}
                      className="w-full h-10 px-3 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="read_only">Read Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input
                      type="email"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <Input
                      type="tel"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      placeholder="Phone"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">New Password (leave blank to keep current)</label>
                    <Input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingUser.can_edit_bills}
                        onChange={(e) => setEditingUser({ ...editingUser, can_edit_bills: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Can Edit Bills</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingUser.can_edit_stock}
                        onChange={(e) => setEditingUser({ ...editingUser, can_edit_stock: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Can Edit Stock</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingUser.can_authorize_nongst}
                        onChange={(e) => setEditingUser({ ...editingUser, can_authorize_nongst: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Can Authorize Non-GST</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingUser.twofa_enabled}
                        onChange={(e) => setEditingUser({ ...editingUser, twofa_enabled: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">2FA Enabled</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
