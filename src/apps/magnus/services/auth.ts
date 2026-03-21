import { User } from '../types';
import { apiFetch } from '../../../shared/utils/apiFetch';

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
        localStorage.setItem('magnus_current_user', JSON.stringify(user));
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
        localStorage.setItem('magnus_current_user', JSON.stringify(newUser));
        return newUser;
    },

    updateProfile: async (username: string, updates: Partial<User>): Promise<User> => {
        const response = await apiFetch(`/api/users/${username}`, {
            method: 'PUT',
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
        // Update local session if it's the current user
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            localStorage.setItem('magnus_current_user', JSON.stringify(updatedUser));
        }
        return updatedUser;
    },

    getAllUsers: async (): Promise<User[]> => {
        const response = await apiFetch('/api/users');
        return response.json();
    },

    updateUserTag: async (username: string, tag: string, action: 'add' | 'remove'): Promise<User> => {
        const response = await apiFetch(`/api/users/${username}/tags`, {
            method: 'POST',
            body: JSON.stringify({ tag, action })
        });
        return response.json();
    },

    logout: () => {
        localStorage.removeItem('magnus_current_user');
    },

    getCurrentUser: (): User | null => {
        const userJson = localStorage.getItem('magnus_current_user');
        return userJson ? JSON.parse(userJson) : null;
    }
};
