import React from 'react';
import Homepage from './components/Homepage/Homepage';
import Room from './components/Room/Room';
import Header from './components/Header/Header';
import {
	BrowserRouter as Router,
	Switch,
	Route
} from "react-router-dom";

function App() {
	return (
		<Router>
			<Switch>
				<Route exact path="/" component={Homepage}/>
				<Route path="/room/:roomId" component={Room}/>
			</Switch>
		</Router>
	);
}

export default App;
