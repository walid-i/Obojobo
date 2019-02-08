const decreaseIndent = (event, editor) => {
	event.preventDefault()
	editor.value.blocks.forEach(block => {
		let newIndent = block.data.get('indent') - 1
		if (newIndent < 1) newIndent = 0

		return editor.setNodeByKey(block.key, {
			data: { indent: newIndent }
		})
	})
	return true
}

export default decreaseIndent
