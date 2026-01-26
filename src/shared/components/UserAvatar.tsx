import React, { useMemo } from 'react';
import * as Icons from 'lucide-react';
import { User } from '../types/user';

interface UserAvatarProps {
    user: User | null;
    className?: string;
    showBorder?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, className = "h-10 w-10", showBorder = true }) => {

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Theme to Icon Mapping
    const THEME_ICONS: Record<string, keyof typeof Icons> = {
        sakura: 'Flower',
        gothic: 'Skull',
        luxury: 'Crown',
        cyber: 'Zap',
        zen: 'Leaf',
        ocean: 'Waves'
    };

    const AvatarContent = useMemo(() => {
        if (!user) return <span className="text-sm font-bold">ES</span>;

        // 1. Explicit Icon Avatar (Legacy support 'icon:Name')
        if (user.avatar && user.avatar.startsWith('icon:')) {
            const iconName = user.avatar.replace('icon:', '');
            const LucideIcon = (Icons as any)[iconName];
            if (LucideIcon) return <LucideIcon className="w-3/5 h-3/5 text-black" />;
        }

        // 2. Explicit Image Avatar
        if (user.avatar && !user.avatar.startsWith('icon:')) {
            return <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />;
        }

        // 3. VIP Theme Avatar (Auto-detected)
        const isVIP = user.username.toLowerCase() === 'soberano' || user.role === 'admin' || user.tags?.some(t => t.toLowerCase() === 'vip');
        if (isVIP && user.preferences?.chatTheme && user.preferences.chatTheme !== 'default') {
            const iconName = THEME_ICONS[user.preferences.chatTheme];
            const LucideIcon = (Icons as any)[iconName];
            if (LucideIcon) return <LucideIcon className="w-3/5 h-3/5 text-black" />;
        }

        // 4. Default Initials
        return <span className="text-sm font-bold">{getInitials(user.name)}</span>;
    }, [user]);

    // VIP Detection
    const isVIP = user?.username.toLowerCase() === 'soberano' || user?.role === 'admin' || user?.tags?.some(t => t.toLowerCase() === 'vip');

    // VIP Ring of Power vs Standard Border
    let borderStyle = "";
    if (showBorder) {
        if (isVIP) {
            borderStyle = "ring-2 ring-theme-gold ring-offset-2 ring-offset-transparent shadow-[0_0_20px_rgba(212,175,55,0.6)] animate-pulse-slow";
        } else {
            borderStyle = "border-2 border-theme-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]";
        }
    }

    // Determining background based on content type
    const isImage = user?.avatar && !user.avatar.startsWith('icon:');
    const bgStyle = isImage ? "" : "bg-theme-gold flex items-center justify-center text-black font-serif";

    return (
        <div className={`${className} rounded-full overflow-hidden ${borderStyle} ${bgStyle}`}>
            {AvatarContent}
        </div>
    );
};
