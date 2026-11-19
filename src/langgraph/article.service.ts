import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import { HumanMessage } from '@langchain/core/messages'
import { config } from '../config.js'


const ArticleState = Annotation.Root({
    article: Annotation<string>(),

    keywords: Annotation<string[]>({
        reducer: (prev, curr) => [...prev, ...curr],
        default: () => []
    }),

    summary: Annotation<string>(),

    log: Annotation<string[]>({
        reducer: (prev, curr) => [...prev, ...curr],
        default: () => [],
    }),
})

@Injectable()
export class ArticleService implements OnModuleInit {
    private graph: any

    onModuleInit() {
        const llm = new ChatOpenAI({
            model: config.langGraph.model,
            apiKey: config.langGraph.apiKey,
            configuration: { baseURL: config.langGraph.baseURL },
            temperature: 0.3
        })

        // 节点1： 提取关键词
        const extractKeyWord = async (state: typeof ArticleState.State) => {
            const t0 = Date.now()
            const res = await llm.invoke([
                new HumanMessage(
                    `从以下文章提取 5-8 个核心关键词，只输出关键词，逗号分隔，不要其他内容：\n\n${state.article}`
                )
            ])

            const keywords = (res.content as string).split(/[,，]/).filter(Boolean)

            return {
                keywords,
                log: [`关键词提取完成（${Date.now() - t0}ms）`],
            }
        }
        // 节点2： 生成摘要
        const generateSummary = async (state: typeof ArticleState.State) => {
            const t0 = Date.now()
            const res = await llm.invoke([
                new HumanMessage( `根据以下文章生成 200 字以内的摘要。\n关键词参考：${state.keywords.join('、')}\n\n文章：\n${state.article}`)
            ])
            return {
                summary: res.content as string,
                log: `[摘要生成完成(${Date.now() - t0}]`
            }
        }

        this.graph = new StateGraph(ArticleState)
        .addNode('extractKeywords', extractKeyWord)
        .addNode('generateSummary', generateSummary)
        .addEdge(START, 'extractKeywords')
        .addEdge('extractKeywords', 'generateSummary')
        .addEdge('generateSummary', END)
        .compile()
    }

    async process(article: string) {
        const result = await this.graph.invoke({article})

        return {
            keyword: result.keywords,
            summary: result.summary,
            log: result.log
        }
    }
}