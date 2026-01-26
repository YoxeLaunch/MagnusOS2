import React from 'react';
import { Simulator } from './Simulator';
import { Finance } from './Finance';

export const Laboratory: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto scroll-smooth">
            <div className="space-y-12 pb-12">
                <section id="simulator-section">
                    <Simulator />
                </section>

                <section id="finance-section">
                    <Finance />
                </section>
            </div>
        </div>
    );
};
