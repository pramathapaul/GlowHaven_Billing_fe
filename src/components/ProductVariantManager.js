import React, { useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaPalette, FaTag, FaSave, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function ProductVariantManager({ product, onVariantUpdate, onClose }) {
  const [variants, setVariants] = useState(product.variants || []);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [variantForm, setVariantForm] = useState({
    sku: '',
    name: '',
    colorCode: '#8B0000',
    stock: 0,
    price: product.basePrice || 0
  });

  const commonColors = [
    { name: 'Red', code: '#DC143C' },
    { name: 'Pink', code: '#FF69B4' },
    { name: 'Nude', code: '#E8C3AD' },
    { name: 'Brown', code: '#8B4513' },
    { name: 'Black', code: '#000000' },
    { name: 'Maroon', code: '#800000' },
    { name: 'Coral', code: '#FF7F50' },
    { name: 'Peach', code: '#FFDAB9' },
    { name: 'Rose', code: '#FF007F' },
    { name: 'Burgundy', code: '#900020' },
    { name: 'Plum', code: '#DDA0DD' },
    { name: 'Mauve', code: '#E0B0FF' },
    { name: 'Magenta', code: '#FF00FF' },
    { name: 'Orange', code: '#FFA500' },
    { name: 'Yellow', code: '#FFD700' }
  ];

  const handleAddVariant = () => {
    if (!variantForm.sku || !variantForm.name) {
      toast.error('Please fill SKU and Name');
      return;
    }
    
    if (variants.some(v => v.sku === variantForm.sku)) {
      toast.error('SKU already exists');
      return;
    }
    
    setVariants([...variants, { ...variantForm }]);
    setVariantForm({ sku: '', name: '', colorCode: '#8B0000', stock: 0, price: product.basePrice || 0 });
    setShowAddVariant(false);
    toast.success('Variant added');
  };

  const handleUpdateVariant = () => {
    if (!variantForm.sku || !variantForm.name) {
      toast.error('Please fill SKU and Name');
      return;
    }
    
    const newVariants = [...variants];
    newVariants[editingIndex] = { ...variantForm };
    setVariants(newVariants);
    setEditingIndex(null);
    setVariantForm({ sku: '', name: '', colorCode: '#8B0000', stock: 0, price: product.basePrice || 0 });
    setShowAddVariant(false);
    toast.success('Variant updated');
  };

  const handleDeleteVariant = (index) => {
    if (window.confirm('Are you sure you want to delete this variant?')) {
      const newVariants = variants.filter((_, i) => i !== index);
      setVariants(newVariants);
      toast.success('Variant deleted');
    }
  };

  const handleEditVariant = (index) => {
    setEditingIndex(index);
    setVariantForm(variants[index]);
    setShowAddVariant(true);
  };

  const saveVariants = async () => {
    try {
      const updatedProduct = { ...product, variants, hasVariants: variants.length > 0 };
      await axios.put(`${API_URL}/products/${product._id}`, updatedProduct);
      toast.success('Variants saved successfully!');
      onVariantUpdate(updatedProduct);
      onClose();
    } catch (error) {
      toast.error('Error saving variants');
    }
  };

  const getTotalStock = () => {
    return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  return (
    <div className="variant-manager p-4">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <h5 className="mb-0">
          <FaPalette className="me-2" /> Manage Shades - {product.name}
        </h5>
        <button className="btn btn-sm btn-danger" onClick={onClose}>
          <FaTimes /> Close
        </button>
      </div>

      <div className="mb-3 text-end">
        <button className="btn btn-primary" onClick={() => {
          setEditingIndex(null);
          setVariantForm({ sku: '', name: '', colorCode: '#8B0000', stock: 0, price: product.basePrice || 0 });
          setShowAddVariant(true);
        }}>
          <FaPlus /> Add New Shade
        </button>
      </div>

      {showAddVariant && (
        <div className="card mb-4 p-3" style={{ background: '#f8f9fa' }}>
          <h6 className="mb-3">{editingIndex !== null ? 'Edit' : 'Add'} Shade</h6>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">SKU *</label>
              <input type="text" className="form-control" placeholder="e.g., LIP-RED-001"
                value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Shade Name *</label>
              <input type="text" className="form-control" placeholder="e.g., Red Velvet"
                value={variantForm.name} onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Color</label>
              <div className="d-flex">
                <input type="color" className="form-control" style={{ width: '50px', padding: '2px' }}
                  value={variantForm.colorCode} onChange={(e) => setVariantForm({ ...variantForm, colorCode: e.target.value })} />
                <input type="text" className="form-control ms-2" placeholder="Hex"
                  value={variantForm.colorCode} onChange={(e) => setVariantForm({ ...variantForm, colorCode: e.target.value })} />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label">Stock</label>
              <input type="number" className="form-control" value={variantForm.stock}
                onChange={(e) => setVariantForm({ ...variantForm, stock: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Price (Rs.)</label>
              <input type="number" className="form-control" value={variantForm.price}
                onChange={(e) => setVariantForm({ ...variantForm, price: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label">Quick Color Picker:</label>
            <div className="d-flex flex-wrap gap-2 mt-1">
              {commonColors.map(color => (
                <button key={color.code} type="button" className="btn btn-sm p-0" style={{ 
                  backgroundColor: color.code, 
                  width: '30px', 
                  height: '30px',
                  border: '1px solid #ddd',
                  borderRadius: '50%'
                }} onClick={() => setVariantForm({ ...variantForm, colorCode: color.code, name: color.name })}
                title={color.name}></button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-success me-2" onClick={editingIndex !== null ? handleUpdateVariant : handleAddVariant}>
              <FaSave /> {editingIndex !== null ? 'Update' : 'Add'}
            </button>
            <button className="btn btn-secondary" onClick={() => {
              setShowAddVariant(false);
              setEditingIndex(null);
              setVariantForm({ sku: '', name: '', colorCode: '#8B0000', stock: 0, price: product.basePrice || 0 });
            }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead className="table-dark">
            <tr>
              <th>Color</th>
              <th>SKU</th>
              <th>Shade Name</th>
              <th>Stock</th>
              <th>Price (Rs.)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {variants.length === 0 ? (
              <tr><td colSpan="6" className="text-center text-muted py-4">No shades added yet</td></tr>
            ) : (
              variants.map((variant, index) => (
                <tr key={index}>
                  <td className="text-center">
                    <div style={{ 
                      width: '30px', 
                      height: '30px', 
                      backgroundColor: variant.colorCode || '#8B0000',
                      borderRadius: '50%',
                      border: '1px solid #ddd',
                      margin: '0 auto'
                    }} title={variant.colorCode}></div>
                  </td>
                  <td>{variant.sku}</td>
                  <td>{variant.name}</td>
                  <td className={variant.stock < 10 ? 'text-danger fw-bold' : ''}>{variant.stock}</td>
                  <td>Rs.{variant.price || product.basePrice}</td>
                  <td>
                    <button className="btn btn-sm btn-warning me-1" onClick={() => handleEditVariant(index)}><FaEdit /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteVariant(index)}><FaTrash /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="table-info">
            <tr>
              <td colSpan="3" className="text-end"><strong>Total Stock:</strong></td>
              <td colSpan="3"><strong>{getTotalStock()}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 text-end">
        <button className="btn btn-secondary me-2" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={saveVariants}>
          <FaTag /> Save All Shades
        </button>
      </div>
    </div>
  );
}

export default ProductVariantManager;