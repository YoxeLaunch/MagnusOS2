import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user';
import { authService } from '../services/auth';

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize synchronously to avoid flash of redirect
    const [user, setUser] = useState<User | null>(() => {
        return authService.getCurrentUser();
    });

    // Effect for updates (optional if authService is single source of truth)
    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser && JSON.stringify(currentUser) !== JSON.stringify(user)) {
            setUser(currentUser);
        }
    }, []);

    const login = (newUser: User) => {
        setUser(newUser);
        // authService.login() is usually called by the form, but if we need to sync:
        // Assuming the caller handles the API call and passes the user object here.
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('sistemam_current_user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
