import React from 'react';
import './Header.scss';

export default function Header(){
    return (
        <div id="header">
            <div className="left-items">
                <div className="item">
                    Home
                </div>

                <div className="item">
                    About Us
                </div>
            </div>
        </div>
    )
}