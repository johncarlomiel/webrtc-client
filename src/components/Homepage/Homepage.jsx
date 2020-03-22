import React from 'react';
import Header from '../Header/Header';
import './Homepage.scss';
import { Link } from 'react-router-dom';
export default function Homepage() {
    return (
        <div id="home-page">
            <Header />
            <div id="home-body">
                <button>
                <Link to="/room">Start Queue</Link>
                    </button>
            </div>
        </div>
    );
}