export interface UserPreferences {
    magnusIcon?: string;
    finanzaIcon?: string;
    themeColor?: string;
    chatTheme?: 'default' | 'sakura' | 'gothic' | 'luxury' | 'cyber' | 'zen' | 'ocean';
}

export interface User {
    username: string;
    name: string;
    password?: string;
    avatar?: string;
    role: 'admin' | 'user';
    tags?: string[];
    preferences?: UserPreferences;
}
