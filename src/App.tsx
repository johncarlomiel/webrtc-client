import React from 'react';
import Homepage from './components/Homepage/Homepage';
import Room from './components/Room/Room';
import Design from './components/Design';
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
        <Route path="/design" component={Design}/> 
			</Switch>
		</Router>
	);
}

export default App;
