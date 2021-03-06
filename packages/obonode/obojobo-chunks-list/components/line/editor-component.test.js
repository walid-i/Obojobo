import React from 'react'
import renderer from 'react-test-renderer'

import Line from './editor-component'

describe('Line Editor Node', () => {
	test('renders as expected', () => {
		const component = renderer.create(
			<Line
				element={{
					content: { hangingIndent: true }
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('renders without content', () => {
		const component = renderer.create(<Line element={{}} />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('renders without hanging indent', () => {
		const component = renderer.create(
			<Line
				element={{
					content: {}
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('renders with children', () => {
		const component = renderer.create(
			<Line
				element={{
					content: {}
				}}
			>
				children!
			</Line>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})
})
