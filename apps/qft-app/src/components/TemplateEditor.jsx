// TemplateEditor.jsx
// Advanced template editor with syntax highlighting, line numbers, and autocomplete

import React, { useState, useRef, useEffect } from 'react';
import { FaCode, FaCopy, FaSync } from 'react-icons/fa';
import './TemplateEditor.css';

const ALL_FUNCTIONS = {
  // QFT System Integration (20 functions)
  database: [
    { name: 'dbQuery', params: '(table, where, limit)', desc: 'Query database with WHERE clause' },
    { name: 'dbFetch', params: '(table, column, value)', desc: 'Fetch single row' },
    { name: 'dbCount', params: '(table, where)', desc: 'Count rows matching criteria' },
    { name: 'dbExists', params: '(table, column, value)', desc: 'Check if record exists' },
  ],
  registry: [
    { name: 'regGet', params: '(key, type)', desc: 'Get registry entry by key' },
    { name: 'regGetAll', params: '(type)', desc: 'Get all registry entries of type' },
    { name: 'regSet', params: '(key, type, value, description)', desc: 'Create/update registry entry' },
    { name: 'regDelete', params: '(key, type)', desc: 'Delete registry entry' },
  ],
  user: [
    { name: 'getUser', params: '(userId)', desc: 'Fetch user data' },
    { name: 'getUserRoles', params: '(userId)', desc: 'Get all user roles' },
    { name: 'getUserHighestRole', params: '(userId)', desc: 'Get highest clearance role' },
    { name: 'hasRole', params: '(userId, roleId)', desc: 'Check if user has role' },
    { name: 'checkPermission', params: '(userId, permissionKey)', desc: 'Check user permission' },
    { name: 'getUserPermissions', params: '(userId)', desc: 'Get all user permissions' },
  ],
  filter: [
    { name: 'isBotUser', params: '(userId)', desc: 'Check if user is a bot' },
    { name: 'filterBots', params: '(userIds)', desc: 'Remove bots from list' },
    { name: 'validateUser', params: '(userId)', desc: 'Validate user exists' },
    { name: 'validateRole', params: '(roleId)', desc: 'Validate role exists' },
  ],
  module: [
    { name: 'moduleGet', params: '(moduleId)', desc: 'Get module configuration' },
    { name: 'moduleList', params: '(pageId)', desc: 'List modules on page' },
  ],
  string: [
    { name: 'upper', params: '(str)', desc: 'Convert to uppercase' },
    { name: 'lower', params: '(str)', desc: 'Convert to lowercase' },
    { name: 'title', params: '(str)', desc: 'Title case' },
    { name: 'split', params: '(str, sep)', desc: 'Split string' },
    { name: 'joinStr', params: '(sep, ...args)', desc: 'Join strings' },
    { name: 'hasPrefix', params: '(str, prefix)', desc: 'Check prefix' },
    { name: 'hasSuffix', params: '(str, suffix)', desc: 'Check suffix' },
    { name: 'trimSpace', params: '(str)', desc: 'Trim whitespace' },
    { name: 'replace', params: '(str, old, new)', desc: 'Replace string' },
  ],
  math: [
    { name: 'add', params: '(a, b)', desc: 'Addition' },
    { name: 'sub', params: '(a, b)', desc: 'Subtraction' },
    { name: 'mult', params: '(a, b)', desc: 'Multiplication' },
    { name: 'div', params: '(a, b)', desc: 'Division' },
    { name: 'mod', params: '(a, b)', desc: 'Modulo' },
    { name: 'randInt', params: '(min, max)', desc: 'Random integer' },
  ],
  conditional: [
    { name: 'if', params: '(condition, true, false)', desc: 'Conditional' },
    { name: 'eq', params: '(a, b)', desc: 'Equals' },
    { name: 'ne', params: '(a, b)', desc: 'Not equals' },
    { name: 'lt', params: '(a, b)', desc: 'Less than' },
    { name: 'gt', params: '(a, b)', desc: 'Greater than' },
    { name: 'and', params: '(...args)', desc: 'Logical AND' },
    { name: 'or', params: '(...args)', desc: 'Logical OR' },
    { name: 'not', params: '(val)', desc: 'Logical NOT' },
  ],
  array: [
    { name: 'len', params: '(val)', desc: 'Length' },
    { name: 'index', params: '(arr, idx)', desc: 'Get index' },
    { name: 'slice', params: '(arr, start, end)', desc: 'Slice array' },
    { name: 'range', params: '(start, end)', desc: 'Create range' },
    { name: 'sort', params: '(list)', desc: 'Sort array' },
    { name: 'shuffle', params: '(list)', desc: 'Shuffle array' },
    { name: 'reverse', params: '(list)', desc: 'Reverse array' },
    { name: 'seq', params: '(...values)', desc: 'Create slice' },
  ],
  format: [
    { name: 'print', params: '(...args)', desc: 'Print with spaces' },
    { name: 'println', params: '(...args)', desc: 'Print with newline' },
    { name: 'printf', params: '(format, ...args)', desc: 'Format string' },
    { name: 'humanizeThousands', params: '(num)', desc: 'Add thousand separators' },
    { name: 'toInt', params: '(val)', desc: 'Convert to integer' },
    { name: 'toFloat', params: '(val)', desc: 'Convert to float' },
    { name: 'toString', params: '(val)', desc: 'Convert to string' },
  ],
  variable: [
    { name: 'setVar', params: '(name, value)', desc: 'Store variable' },
    { name: 'getVar', params: '(name)', desc: 'Get stored variable' },
  ],
};

const VARIABLES = [
  { name: '.User.ID', desc: 'Current user ID' },
  { name: '.User.Username', desc: 'Current username' },
  { name: '.Channel.ID', desc: 'Channel ID' },
  { name: '.Guild.ID', desc: 'Guild/Server ID' },
  { name: '.Member', desc: 'Member object' },
  { name: '.Message', desc: 'Message object' },
  { name: '.Args', desc: 'Command arguments' },
];

const TemplateEditor = ({ value, onChange, onExecute }) => {
  const [lines, setLines] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, col: 0 });
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Initialize lines
  useEffect(() => {
    updateLines(value);
  }, []);

  const updateLines = (text) => {
    const lineArray = text.split('\n');
    setLines(lineArray);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    updateLines(newValue);
    
    // Get cursor position
    const textarea = textareaRef.current;
    const beforeCursor = newValue.substring(0, textarea.selectionStart);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const col = lastNewline === -1 ? beforeCursor.length : beforeCursor.length - lastNewline - 1;
    const line = beforeCursor.split('\n').length - 1;
    
    setCursorPosition({ line, col });
    updateSuggestions(newValue, textarea.selectionStart);
  };

  const updateSuggestions = (text, cursorPos) => {
    // Get word at cursor
    const beforeCursor = text.substring(0, cursorPos);
    const wordMatch = beforeCursor.match(/[\w.]*$/);
    const word = wordMatch ? wordMatch[0].toLowerCase() : '';

    if (word.length < 1) {
      setShowSuggestions(false);
      return;
    }

    const matches = [];

    // Search functions
    Object.values(ALL_FUNCTIONS).forEach(category => {
      category.forEach(func => {
        if (func.name.toLowerCase().startsWith(word)) {
          matches.push({ type: 'function', ...func });
        }
      });
    });

    // Search variables
    VARIABLES.forEach(variable => {
      if (variable.name.toLowerCase().startsWith(word)) {
        matches.push({ type: 'variable', ...variable });
      }
    });

    setSuggestions(matches.slice(0, 8)); // Limit to 8 suggestions
    setShowSuggestions(matches.length > 0);
    setSuggestionIndex(0);
  };

  const applySuggestion = (suggestion) => {
    const textarea = textareaRef.current;
    const beforeCursor = value.substring(0, textarea.selectionStart);
    const wordMatch = beforeCursor.match(/[\w.]*$/);
    const word = wordMatch ? wordMatch[0] : '';
    const startPos = textarea.selectionStart - word.length;

    let newValue;
    if (suggestion.type === 'function') {
      newValue = value.substring(0, startPos) + 
                 suggestion.name + suggestion.params + 
                 value.substring(textarea.selectionStart);
    } else {
      newValue = value.substring(0, startPos) + 
                 suggestion.name + 
                 value.substring(textarea.selectionStart);
    }

    onChange(newValue);
    updateLines(newValue);
    setShowSuggestions(false);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = startPos + suggestion.name.length + (suggestion.params ? suggestion.params.length : 0);
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applySuggestion(suggestions[suggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    alert('Template copied to clipboard!');
  };

  const highlightSyntax = (text) => {
    // Highlight template syntax {{ }}
    return text
      .replace(/\{\{/g, '<span class="syntax-bracket">{{</span>')
      .replace(/\}\}/g, '<span class="syntax-bracket">}}</span>')
      .replace(/\b(if|range|else|end)\b/g, '<span class="syntax-keyword">$1</span>')
      .replace(/\b(and|or|not)\b/g, '<span class="syntax-operator">$1</span>')
      .replace(/\.(User|Channel|Guild|Member|Message|Args)\b/g, '<span class="syntax-variable">$&</span>');
  };

  return (
    <div className="template-editor">
      <div className="editor-header">
        <div className="editor-title">
          <FaCode /> Template Editor
        </div>
        <div className="editor-actions">
          <button 
            className="editor-btn copy-btn" 
            onClick={copyToClipboard}
            title="Copy template"
          >
            <FaCopy /> Copy
          </button>
          {onExecute && (
            <button 
              className="editor-btn execute-btn" 
              onClick={onExecute}
              title="Execute template"
            >
              <FaSync /> Execute
            </button>
          )}
        </div>
      </div>

      <div className="editor-container">
        {/* Line Numbers */}
        <div className="line-numbers">
          {lines.map((_, i) => (
            <div key={i} className="line-number">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="editor-content">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="editor-textarea"
            placeholder="Enter your template here... (Ctrl+Space for suggestions)"
            spellCheck="false"
          />
          
          {/* Syntax Highlighting Background */}
          <div className="editor-highlight">
            {lines.map((line, i) => (
              <div key={i} className="highlight-line">
                <div 
                  className="highlight-text"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightSyntax(line) 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && (
            <div 
              ref={suggestionsRef}
              className="autocomplete-suggestions"
              style={{
                position: 'absolute',
                top: `${(cursorPosition.line + 1) * 20 + 10}px`,
                left: `${cursorPosition.col * 8 + 40}px`,
              }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`suggestion-item ${index === suggestionIndex ? 'active' : ''}`}
                  onClick={() => applySuggestion(suggestion)}
                  onMouseEnter={() => setSuggestionIndex(index)}
                >
                  <span className={`suggestion-icon ${suggestion.type}`}>
                    {suggestion.type === 'function' ? 'ƒ' : '$'}
                  </span>
                  <div className="suggestion-content">
                    <div className="suggestion-name">
                      {suggestion.name}
                      {suggestion.params && (
                        <span className="suggestion-params">{suggestion.params}</span>
                      )}
                    </div>
                    <div className="suggestion-desc">{suggestion.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className="editor-info">
        <div className="info-item">
          Lines: <strong>{lines.length}</strong>
        </div>
        <div className="info-item">
          Characters: <strong>{value.length}</strong>
        </div>
        <div className="info-item">
          Cursor: <strong>Line {cursorPosition.line + 1}, Col {cursorPosition.col}</strong>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
