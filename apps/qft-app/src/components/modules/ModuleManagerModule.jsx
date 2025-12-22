import React, { useState, useEffect } from 'react';
import Switch from '../elements/Switch';
import { FaCog, FaEye, FaEyeSlash, FaGripVertical, FaPlus, FaTrash, FaSync } from 'react-icons/fa';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './ModuleManagerModule.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Sortable Module Card Component
function SortableModuleCard({ module, categoryId, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`module-card ${!module.enabled ? 'disabled' : ''}`}
    >
      <div className="module-card-header">
        <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
          <FaGripVertical className="drag-handle" />
        </div>
        <span className="module-name">{module.name}</span>
      </div>
      <div className="module-card-actions">
        <button
          className={`icon-btn ${module.enabled ? 'primary' : 'secondary'}`}
          onClick={() => onToggle(categoryId, module.id)}
          title={module.enabled ? 'Disable' : 'Enable'}
        >
          {module.enabled ? <FaEye /> : <FaEyeSlash />}
        </button>
        <button className="icon-btn secondary" title="Configure">
          <FaCog />
        </button>
        <button className="icon-btn danger" title="Delete">
          <FaTrash />
        </button>
      </div>
    </div>
  );
}

// Sortable Category Component
function SortableCategory({ category, onToggle, onModuleToggle, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="category-section">
      <div className="category-header">
        <div className="category-info">
          <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
            <FaGripVertical className="drag-handle" />
          </div>
          <h4>{category.name}</h4>
          <span className="module-count-badge">
            {category.modules.length} modules
          </span>
        </div>
        <div className="category-actions">
          <Switch
            checked={category.enabled}
            onChange={() => onToggle(category.id)}
            ariaLabel={`Toggle ${category.name} category`}
          />
          <button className="icon-btn danger" title="Delete Category">
            <FaTrash />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function ModuleManagerModule() {
  const [selectedPage, setSelectedPage] = useState('bot-management');
  const [pageModules, setPageModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch module data from backend
  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('qft-token');
      const response = await fetch(`${API_URL}/api/v1/modules/pages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch module configuration');
      }

      const data = await response.json();
      setPageModules(data.pages || {});
    } catch (err) {
      setError(err.message);
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategoryEnabled = async (categoryId) => {
    const currentPage = pageModules[selectedPage];
    const category = currentPage.categories.find(c => c.id === categoryId);
    
    try {
      const token = localStorage.getItem('qft-token');
      const response = await fetch(`${API_URL}/api/v1/modules/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !category.enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      // Update local state
      setPageModules(prev => ({
        ...prev,
        [selectedPage]: {
          ...prev[selectedPage],
          categories: prev[selectedPage].categories.map(cat =>
            cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
          )
        }
      }));
    } catch (err) {
      console.error('Error toggling category:', err);
      alert('Failed to update category: ' + err.message);
    }
  };

  const toggleModuleEnabled = async (categoryId, moduleId) => {
    try {
      const currentPage = pageModules[selectedPage];
      const category = currentPage.categories.find(c => c.id === categoryId);
      const module = category.modules.find(m => m.id === moduleId);

      const token = localStorage.getItem('qft-token');
      const response = await fetch(`${API_URL}/api/v1/modules/${moduleId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !module.enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to update module');
      }

      // Update local state
      setPageModules(prev => ({
        ...prev,
        [selectedPage]: {
          ...prev[selectedPage],
          categories: prev[selectedPage].categories.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  modules: cat.modules.map(mod =>
                    mod.id === moduleId ? { ...mod, enabled: !mod.enabled } : mod
                  )
                }
              : cat
          )
        }
      }));
    } catch (err) {
      console.error('Error toggling module:', err);
      alert('Failed to update module: ' + err.message);
    }
  };

  const initializeDefaultModules = async () => {
    if (!confirm('This will create the default module structure. Continue?')) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('qft-token');
      const response = await fetch(`${API_URL}/api/v1/modules/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Default modules initialized successfully');
        await fetchModules();
      } else {
        alert(data.message || 'Failed to initialize modules');
      }
    } catch (err) {
      console.error('Error initializing modules:', err);
      alert('Failed to initialize modules: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle module drag end
  const handleModuleDragEnd = async (event, categoryId) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const currentPage = pageModules[selectedPage];
    const category = currentPage.categories.find(c => c.id === categoryId);
    const oldIndex = category.modules.findIndex(m => m.id === active.id);
    const newIndex = category.modules.findIndex(m => m.id === over.id);

    // Reorder modules locally
    const reorderedModules = arrayMove(category.modules, oldIndex, newIndex);
    
    // Update display orders
    const updates = reorderedModules.map((module, index) => ({
      module_id: module.id,
      display_order: index
    }));

    // Optimistic update
    setPageModules(prev => ({
      ...prev,
      [selectedPage]: {
        ...prev[selectedPage],
        categories: prev[selectedPage].categories.map(cat =>
          cat.id === categoryId
            ? { ...cat, modules: reorderedModules }
            : cat
        )
      }
    }));

    // Persist to backend
    try {
      const token = localStorage.getItem('qft-token');
      await fetch(`${API_URL}/api/v1/modules/reorder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      });
    } catch (err) {
      console.error('Error saving module order:', err);
      // Revert on error
      await fetchModules();
    }
  };

  // Handle category drag end
  const handleCategoryDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const currentPage = pageModules[selectedPage];
    const oldIndex = currentPage.categories.findIndex(c => c.id === active.id);
    const newIndex = currentPage.categories.findIndex(c => c.id === over.id);

    // Reorder categories locally
    const reorderedCategories = arrayMove(currentPage.categories, oldIndex, newIndex);
    
    // Update display orders
    const updates = reorderedCategories.map((category, index) => ({
      category_id: category.id,
      display_order: index
    }));

    // Optimistic update
    setPageModules(prev => ({
      ...prev,
      [selectedPage]: {
        ...prev[selectedPage],
        categories: reorderedCategories
      }
    }));

    // Persist to backend
    try {
      const token = localStorage.getItem('qft-token');
      await fetch(`${API_URL}/api/v1/modules/categories/reorder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      });
    } catch (err) {
      console.error('Error saving category order:', err);
      // Revert on error
      await fetchModules();
    }
  };

  if (loading) {
    return (
      <div className="module-manager">
        <div className="module-manager-header">
          <h2><FaCog /> Module Manager</h2>
          <p>Loading module configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="module-manager">
        <div className="module-manager-header">
          <h2><FaCog /> Module Manager</h2>
          <p style={{ color: '#e74c3c' }}>Error: {error}</p>
        </div>
        <div style={{ padding: '20px' }}>
          <button className="qft-button primary" onClick={fetchModules}>
            <FaSync /> Retry
          </button>
          <button className="qft-button secondary" onClick={initializeDefaultModules} disabled={saving}>
            {saving ? 'Initializing...' : 'Initialize Default Modules'}
          </button>
        </div>
      </div>
    );
  }

  if (Object.keys(pageModules).length === 0) {
    return (
      <div className="module-manager">
        <div className="module-manager-header">
          <h2><FaCog /> Module Manager</h2>
          <p>No modules configured</p>
        </div>
        <div style={{ padding: '20px' }}>
          <p>Click below to set up the default module structure.</p>
          <button className="qft-button primary" onClick={initializeDefaultModules} disabled={saving}>
            {saving ? 'Initializing...' : 'Initialize Default Modules'}
          </button>
        </div>
      </div>
    );
  }

  const currentPage = pageModules[selectedPage] || { name: 'Unknown Page', categories: [] };

  return (
    <div className="module-manager">
      <div className="module-manager-header">
        <h2><FaCog /> Module Manager</h2>
        <p>Configure which modules and pages are visible to users</p>
      </div>

      <div className="module-manager-layout">
        {/* Page Selector */}
        <div className="page-selector">
          <h3>Select Page</h3>
          <div className="page-list">
            {Object.entries(pageModules).map(([key, page]) => (
              <button
                key={key}
                className={`page-item ${selectedPage === key ? 'active' : ''}`}
                onClick={() => setSelectedPage(key)}
              >
                <span className="page-name">{page.name}</span>
                <span className="module-count">
                  {page.categories.reduce((acc, cat) => acc + cat.modules.length, 0)} modules
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Module Configuration */}
        <div className="module-configuration">
          <div className="config-header">
            <h3>{currentPage.name}</h3>
            <button className="qft-button secondary small">
              <FaPlus /> Add Category
            </button>
          </div>

          <div className="categories-list">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCategoryDragEnd}
            >
              <SortableContext
                items={currentPage.categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {currentPage.categories.map(category => (
                  <SortableCategory
                    key={category.id}
                    category={category}
                    onToggle={toggleCategoryEnabled}
                    onModuleToggle={toggleModuleEnabled}
                  >
                    <div className="modules-grid">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleModuleDragEnd(event, category.id)}
                      >
                        <SortableContext
                          items={category.modules.map(m => m.id)}
                          strategy={rectSortingStrategy}
                        >
                          {category.modules.map(module => (
                            <SortableModuleCard
                              key={module.id}
                              module={module}
                              categoryId={category.id}
                              onToggle={toggleModuleEnabled}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                      <button className="add-module-card">
                        <FaPlus /> Add Module
                      </button>
                    </div>
                  </SortableCategory>
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="config-footer">
            <button className="qft-button secondary" onClick={fetchModules} disabled={loading}>
              <FaSync /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="qft-button primary" onClick={() => alert('Changes are saved automatically')}>
              Auto-Saved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModuleManagerModule;
