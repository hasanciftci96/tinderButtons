import React from "react"
import TinderAdMakerComponent from "./TinderAdMakerComponent"

function App() {
	return (
		<div className="App">
			<h1>Tinder </h1>
			<TinderAdMakerComponent
				renderItems={{
					headLine: (items, isFocused, currentSubItemIndex) => {
						return (
							<div>
								<>
									<h3 style={{ display: "inline" }}> | </h3>
									{items.map((item, index) => {
										//if you want to select 2 or more headlines then do .map, essentially you put here anything you want to render
										const isSubItemFocused = index === currentSubItemIndex
										return (
											<>
												<h3
													style={{
														color: isSubItemFocused ? "green" : "#222",
														display: "inline",
													}}
												>
													{(item ?? "__") + " "}
												</h3>
												<h3 style={{ display: "inline" }}> | </h3>
											</>
										)
									})}
								</>
							</div>
						)
					},
					description: (item, isFocused) => (
						<p style={{ color: isFocused ? "green" : "#222" }}>{item}</p>
					),
					subDescription: (item, isFocused) => (
						<p style={{ color: isFocused ? "green" : "#222" }}>{item}</p>
					),
				}}
				limits={{
					headLine: 1, // if limits are more that data length, it reduces to data length
					// if ( number of data items/ number of items) less than limit, it reduces to that
					description: 2,
					subDescription: 2,
				}}
				numberOfItems={{
					headLine: 2, // if numberOfItems are more that data length, it reduces to data length
					description: 1,
					subDescription: 1,
				}}
				// order={[ 'headLine', 'description', 'subDescription', 'sub2']} // optional, fallsback to data keys

				// displayOrder={[ 'description','headLine', 'subDescription', 'sub2']} // optional, fallsback to renderItems keys

				renderButtons={({
					approval,
					goBack,
					finished,
					canGoBack,
					goUp,
					goDown,
					canGoUp,
					canGoDown,
				}) => (
					<>
						<button disabled={finished} onClick={() => approval(true)}>
							Approve
						</button>
						<button disabled={finished} onClick={() => approval(false)}>
							Reject
						</button>
						<button disabled={!canGoBack} onClick={() => goBack()}>
							Go back
						</button>
						<button disabled={!canGoUp} onClick={() => goUp()}>
							up
						</button>
						<button disabled={!canGoDown} onClick={() => goDown()}>
							down
						</button>
					</>
				)}
				onFinished={({ rejectedItems, approvedAds }) => {
					// we can navigate to next ad type here
					console.info("approvedAds", approvedAds) // ex: [{ headLine: "h1", description: "t1", subDescription: "s3"},{ headLine: "h1", description: "t1", subDescription: "s2"}]
					console.info("rejectedItems", rejectedItems) // ex: {headLine: ['h2'], subDescription: ['s3']'}
				}}
				data={{
					headLine: ["h1", "h2", "h3", "h4", "h5", "h6"],
					description: ["t1", "t2", "t3", "t4", "t5", "t6"],
					subDescription: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
				}}
			/>
		</div>
	)
}

export default App
