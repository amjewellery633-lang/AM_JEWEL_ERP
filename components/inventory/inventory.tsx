'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getItems, createItem, updateItem, deleteItem, type Item } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'

const categoryOptions = [
  'Rings',
  'Tops / Kammal',
  'Chain',
  'Bracelets',
  'Bangle',
  'Necklace',
  'Hār',
  'Dollar (Pendant)',
  'Māng Tikkā',
  'Bay Ring',
  'Tali',
  'Others'
]

export function Inventory() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newItem, setNewItem] = useState<Partial<Item>>({
    barcode: '',
    item_name: '',
    category: '',
    weight: 0,
    purity: '',
    making_charges: 0,
    stone_type: '',
    hsn_code: '',
    gst_rate: 5,
    price_per_gram: 0,
    net_price: 0,
    stock_status: 'in_stock',
    location: '',
    remarks: '',
    metal_type: 'gold',
  })
  const [customCategory, setCustomCategory] = useState('')

  // Fetch items from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const itemsData = await getItems()
        setItems(itemsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load data. Please check console.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAddItem = async () => {
    if (!newItem.barcode || !newItem.item_name || !newItem.category || !newItem.weight) {
      toast({
        title: 'Required Fields',
        description: 'Barcode, Item Name, Category and Weight are required',
        variant: 'destructive',
      })
      return
    }

    try {
      // If category is "Others" and custom category is provided, use it
      const finalCategory = newItem.category === 'Others' && customCategory.trim()
        ? `Others - ${customCategory.trim()}`
        : newItem.category
      
      const itemToSave = { ...newItem, category: finalCategory }
      
      if (editingId) {
        // Update existing item
        const updated = await updateItem(editingId, itemToSave as Partial<Item>)
        setItems(items.map(item => item.id === editingId ? updated : item))
        setEditingId(null)
        toast({
          title: 'Success',
          description: 'Item updated successfully',
        })
      } else {
        // Create new item
        const created = await createItem(itemToSave as Omit<Item, 'id' | 'created_at'>)
        setItems([created, ...items])
        toast({
          title: 'Success',
          description: 'Item created successfully',
        })
      }
      setNewItem({
        barcode: '',
        item_name: '',
        category: '',
        weight: 0,
        purity: '',
        making_charges: 0,
        stone_type: '',
        hsn_code: '',
        gst_rate: 5,
        price_per_gram: 0,
        net_price: 0,
        stock_status: 'in_stock',
        location: '',
        remarks: '',
        metal_type: 'gold',
      })
      setCustomCategory('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving item:', error)
      toast({
        title: 'Error',
        description: 'Failed to save item. Please check console.',
        variant: 'destructive',
      })
    }
  }

  const handleEditItem = (item: Item) => {
    setNewItem(item)
    // Check if category starts with "Others - " to extract custom category
    if (item.category?.startsWith('Others - ')) {
      setCustomCategory(item.category.substring(9))
      setNewItem({ ...item, category: 'Others' })
    } else {
      setCustomCategory('')
    }
    setEditingId(item.id)
    setShowAddForm(true)
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      await deleteItem(id)
      setItems(items.filter(item => item.id !== id))
      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete item. Please check console.',
        variant: 'destructive',
      })
    }
  }

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Manage jewelry stock and item details</p>
        </div>
        <Button
          onClick={() => {
            setShowAddForm(!showAddForm)
            if (editingId) setEditingId(null)
            setNewItem({
              barcode: '',
              item_name: '',
              category: '',
              weight: 0,
              purity: '',
              making_charges: 0,
              stone_type: '',
              hsn_code: '',
              gst_rate: 5,
              price_per_gram: 0,
              net_price: 0,
              stock_status: 'in_stock',
              location: '',
              remarks: '',
              metal_type: 'gold',
            })
            setCustomCategory('')
          }}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {showAddForm ? 'Cancel' : 'Add Item'}
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">
            {editingId ? 'Edit Item' : 'Add New Item'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Barcode <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Scan or enter barcode"
                required
                value={newItem.barcode || ''}
                onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Item Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Enter item name"
                required
                value={newItem.item_name || ''}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                value={newItem.category || ''}
                onChange={(e) => {
                  setNewItem({ ...newItem, category: e.target.value })
                  if (e.target.value !== 'Others') {
                    setCustomCategory('')
                  }
                }}
                required
                className="w-full h-10 px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground cursor-pointer"
                style={{
                  appearance: 'menulist',
                  WebkitAppearance: 'menulist',
                  MozAppearance: 'menulist',
                  backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E')",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '16px 16px',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">Select category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {newItem.category === 'Others' && (
                <Input
                  placeholder="Specify other category (optional)"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Weight (grams) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                placeholder="Weight in grams"
                step="0.01"
                required
                value={newItem.weight || ''}
                onChange={(e) => setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Metal Type & Purity
              </label>
              <select
                value={newItem.metal_type || 'gold'}
                onChange={(e) => {
                  const metalType = e.target.value;
                  let purity = '';
                  switch(metalType) {
                    case 'gold_916':
                      purity = '91.6';
                      break;
                    case 'gold_750':
                      purity = '75';
                      break;
                    case 'silver_92':
                      purity = '92.5';
                      break;
                    case 'silver_70':
                      purity = '70';
                      break;
                    case 'gold':
                    case 'selam_silver':
                    default:
                      purity = '';
                      break;
                  }
                  setNewItem({ ...newItem, metal_type: metalType, purity });
                }}
                className="h-10 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="gold">Gold (Standard)</option>
                <option value="gold_916">Gold (22k/91.6%)</option>
                <option value="gold_750">Gold (18k/75%)</option>
                <option value="silver_92">Silver (92.5%)</option>
                <option value="silver_70">Silver (70%)</option>
                <option value="selam_silver">Selam Silver</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Making Charges</label>
              <Input
                type="number"
                placeholder="Making charges"
                step="0.01"
                value={newItem.making_charges || ''}
                onChange={(e) => setNewItem({ ...newItem, making_charges: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Stone Type</label>
              <Input
                placeholder="Stone type"
                value={newItem.stone_type || ''}
                onChange={(e) => setNewItem({ ...newItem, stone_type: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">HSN Code</label>
              <Input
                placeholder="HSN code"
                value={newItem.hsn_code || ''}
                onChange={(e) => setNewItem({ ...newItem, hsn_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">GST Rate (%)</label>
              <Input
                type="number"
                placeholder="GST rate"
                step="0.1"
                value={newItem.gst_rate || ''}
                onChange={(e) => setNewItem({ ...newItem, gst_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Price per gram
              </label>
              <Input
                type="number"
                placeholder="Rate per gram"
                step="0.01"
                value={newItem.price_per_gram || ''}
                onChange={(e) => setNewItem({ ...newItem, price_per_gram: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Net Price</label>
              <Input
                type="number"
                placeholder="Net price"
                step="0.01"
                value={newItem.net_price || ''}
                onChange={(e) => setNewItem({ ...newItem, net_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Stock Status
              </label>
              <select
                value={newItem.stock_status || 'in_stock'}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    stock_status: e.target.value as 'in_stock' | 'reserved' | 'sold' | 'returned',
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="in_stock">In Stock</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Location
              </label>
              <Input
                placeholder="Store location / tray"
                value={newItem.location || ''}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Remarks</label>
              <Input
                placeholder="Notes or remarks"
                value={newItem.remarks || ''}
                onChange={(e) => setNewItem({ ...newItem, remarks: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAddItem}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {editingId ? 'Update Item' : 'Save Item'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddForm(false)
                setEditingId(null)
                setCustomCategory('')
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search by name or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Inventory Table */}
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border bg-secondary">
              <th className="text-left py-4 px-4 font-semibold text-foreground">Barcode</th>
              <th className="text-left py-4 px-4 font-semibold text-foreground">Name</th>
              <th className="text-left py-4 px-4 font-semibold text-foreground">Category</th>
              <th className="text-left py-4 px-4 font-semibold text-foreground">Purity</th>
              <th className="text-left py-4 px-4 font-semibold text-foreground">Weight</th>
              <th className="text-left py-4 px-4 font-semibold text-foreground">Price/g</th>
              <th className="text-left py-4 px-4 font-semibold text-foreground">Location</th>
              <th className="text-center py-4 px-4 font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-secondary transition-colors">
                <td className="py-3 px-4 text-foreground font-medium">{item.barcode}</td>
                <td className="py-3 px-4 text-foreground">{item.item_name}</td>
                <td className="py-3 px-4 text-foreground">{item.category}</td>
                <td className="py-3 px-4 text-foreground">{item.purity}</td>
                <td className="py-3 px-4 text-foreground">{item.weight}g</td>
                <td className="py-3 px-4 text-foreground">₹{item.price_per_gram?.toFixed(0) || '0'}</td>
                <td className="py-3 px-4 text-foreground">{item.location}</td>
                <td className="py-3 px-4 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-primary hover:text-primary/70 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-destructive hover:text-destructive/70 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <Card className="p-12 text-center mt-4">
          <p className="text-muted-foreground text-lg">No items found</p>
        </Card>
      )}
    </div>
  )
}
