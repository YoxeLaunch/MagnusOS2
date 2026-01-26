import { User } from '../types/user';

export const authService = {
    login: async (username: string, password: string): Promise<User> => {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw error.error || 'Error al iniciar sesión';
        }

        const user = await response.json();
        localStorage.setItem('sistemam_current_user', JSON.stringify(user));
        return user;
    },

    register: async (user: User): Promise<User> => {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        if (!response.ok) {
            const error = await response.json();
            throw error.error || 'Error al registrar';
        }

        const newUser = await response.json();
        localStorage.setItem('sistemam_current_user', JSON.stringify(newUser));
        return newUser;
    },

    logout: () => {
        localStorage.removeItem('sistemam_current_user');
        localStorage.removeItem('magnus_current_user'); // Clean up legacy
    },

    getCurrentUser: (): User | null => {
        // Try new key first, then legacy
        const userJson = localStorage.getItem('sistemam_current_user') || localStorage.getItem('magnus_current_user');
        return userJson ? JSON.parse(userJson) : null;
    },

    updateProfile: async (username: string, updates: Partial<User>): Promise<User> => {
        const response = await fetch(`/api/users/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw errorData.error || 'Error actualizando perfil';
            } catch (e) {
                throw 'Error actualizando perfil';
            }
        }

        const updatedUser = await response.json();
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            localStorage.setItem('sistemam_current_user', JSON.stringify(updatedUser));
        }
        return updatedUser;
    },

    getAllUsers: async (): Promise<User[]> => {
        const response = await fetch('/api/users');
        return response.json();
    },

    updateUserTag: async (username: string, tag: string, action: 'add' | 'remove'): Promise<User> => {
        const response = await fetch(`/api/users/${username}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag, action })
        });
        return response.json();
    }
};
