import React from 'react';

const UserListSidebar = ({ onUserSelect }) => (
    <div className="module-list-container sidebar">
        <h2>Users</h2>
        <ul className="module-list">
            <li onClick={() => onUserSelect('1')}>User 1</li>
            <li onClick={() => onUserSelect('2')}>User 2</li>
        </ul>
    </div>
);

export default UserListSidebar;
