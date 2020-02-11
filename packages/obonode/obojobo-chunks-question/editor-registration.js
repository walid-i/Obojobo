import React from 'react'
import { Node, Element, Transforms, Text } from 'slate'
import Common from 'obojobo-document-engine/src/scripts/common'
import NormalizeUtil from 'obojobo-document-engine/src/scripts/oboeditor/util/normalize-util'

import emptyNode from './empty-node.json'
import Icon from './icon'
import EditorComponent from './editor-component'
import Solution from './components/solution/editor-component'
import Converter from './converter'

const QUESTION_NODE = 'ObojoboDraft.Chunks.Question'
const SOLUTION_NODE = 'ObojoboDraft.Chunks.Question.Solution'
const PAGE_NODE = 'ObojoboDraft.Pages.Page'
const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const TEXT_LINE_NODE = 'ObojoboDraft.Chunks.Text.TextLine'
const MCASSESSMENT_NODE = 'ObojoboDraft.Chunks.MCAssessment'

const Question = {
	name: QUESTION_NODE,
	menuLabel: 'Question',
	icon: Icon,
	isInsertable: true,
	supportsChildren: true,
	helpers: Converter,
	json: {
		emptyNode
	},
	plugins: {
		// Editor Plugins - These get attached to the editor object and override it's default functions
		// They may affect multiple nodes simultaneously
		normalizeNode(entry, editor, next) {
			const [node, path] = entry

			// If the element is a Question, handle Content children
			if (Element.isElement(node) && node.type === QUESTION_NODE && !node.subtype) {
				let index = 0
				let hasSolution = false
				let hasMCAssessment = false
				for (const [child, childPath] of Node.children(editor, path, { reverse: true })) {
					// the last index should either be a solution node or a MCAssessment
					if(index === 0 && Element.isElement(child)) {
						if (child.subtype === SOLUTION_NODE){
							hasSolution = true
							index++
							continue
						} else if (child.type === MCASSESSMENT_NODE) {
							hasMCAssessment = true
							index++
							continue
						} else {
							// If the last index is not one of the two valid options
							// insert a MCAssessment and allow subsequent normalizations
							// to fill it
							Transforms.insertNodes(
								editor,
								{
									type: MCASSESSMENT_NODE,
									content: {
										responseType: "pick-one",
										shuffle: true
									},
									questionType: "default",
									children: [{ text: '' }]
								},
								{ at: path.concat(node.children.length) }
							)
							return
						}
					}

					// If there is a solution but no MCAssessment, insert a MCAssessment
					// and allow subsequent normalizations to fill it
					if(index === 1 && hasSolution && child.type !== MCASSESSMENT_NODE) {
							Transforms.insertNodes(
								editor,
								{
									type: MCASSESSMENT_NODE,
									content: {
										responseType: "pick-one",
										shuffle: true
									},
									questionType: "default",
									children: [{ text: '' }]
								},
								{ at: path.concat(node.children.length - 1) }
							)
							return
					}

					if(hasMCAssessment && Element.isElement(child) && !Common.Registry.contentTypes.includes(child.type)){
						Transforms.insertNodes(
							editor,
							{
								type: TEXT_NODE,
								content: {},
								children: [
									{
										type: TEXT_NODE,
										subtype: TEXT_LINE_NODE,
										content: { indent: 0 },
										children: [{ text: '' }]
									}
								]
							},
							{ at: childPath }
						)
						return
					}

					// Wrap loose text children in a Question
					if (Text.isText(child)) {
						Transforms.wrapNodes(
							editor, 
							{
								type: TEXT_NODE,
								content: {},
							},
							{ at: childPath }
						)
						return
					}

					index++
				}
			}

			// If the element is a Solution, make sure there is only one Page child
			if (Element.isElement(node) && node.subtype === SOLUTION_NODE) {
				let index = 0
				for (const [child, childPath] of Node.children(editor, path)) {
					if(index === 0 && Element.isElement(child) && child.type !== PAGE_NODE){
						NormalizeUtil.wrapOrphanedSiblings(
							editor, 
							[child, childPath], 
							{ 
								type: PAGE_NODE, 
								content: {},
								children: []
							}, 
							matchNode => !Common.Registry.contentTypes.includes(matchNode.type)
						)
						return
					}

					if(index > 0) {
						Transforms.removeNodes(
							editor,
							{ at: childPath }
						)
						return
					}

					index++
				}
			}

			next(entry, editor)
		},
		// Editable Plugins - These are used by the PageEditor component to augment React functions
		// They affect individual nodes independently of one another
		renderNode(props) {
			switch (props.element.subtype) {
				case SOLUTION_NODE:
					return <Solution {...props} {...props.attributes} />
				default:
					return <EditorComponent {...props} {...props.attributes} />
			}
		}
	},
	getNavItem(model) {
		const questions = model.parent.children.models.filter(
			child => child.get('type') === QUESTION_NODE
		)
		const label = model.title || `Question ${questions.indexOf(model) + 1}`

		return {
			type: 'sub-link',
			label,
			path: [`#obo-${model.get('id')}`]
		}
	},
}

export default Question
