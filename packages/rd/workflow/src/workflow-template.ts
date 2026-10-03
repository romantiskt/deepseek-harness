/** Six-stage template; privileged steps cannot use generic record completion. */
import type { WorkbenchSnapshot } from '@deepseek-ai/dsh-rd-contracts/types'
/** Nodes preserve the numbering in the approved process diagram. */
export const workflowTemplate: WorkbenchSnapshot['stages'] = [
  {
    id: 'requirements',
    title: '需求与立项',
    nodes: [
      { id: '01', title: '需求收集', role: 'product', mode: 'derived' },
      { id: '02', title: '需求补充与澄清', role: 'product', mode: 'derived' },
      { id: '03', title: '需求评审', role: 'product', mode: 'derived' },
      { id: '04', title: '立项与版本排期', role: 'product', mode: 'derived' },
    ],
  },
  {
    id: 'design',
    title: '设计与评审',
    nodes: [
      { id: '05', title: '技术影响分析', role: 'developer', mode: 'record' },
      { id: '06', title: '技术方案设计', role: 'developer', mode: 'record' },
      { id: '07', title: '技术方案评审', role: 'developer', mode: 'approval' },
      { id: '08', title: '测试方案与用例评审', role: 'tester', mode: 'approval' },
      { id: '09', title: 'UI / 交互与产品评审', role: 'product', mode: 'approval' },
      { id: '10', title: '安全 / 合规 / 性能评审', role: 'developer', mode: 'approval' },
      { id: '11', title: '评审结论与范围冻结', role: 'product', mode: 'derived' },
    ],
  },
  {
    id: 'development',
    title: '开发与 Review',
    nodes: [
      { id: '12', title: '任务拆分与开发计划', role: 'developer', mode: 'derived' },
      { id: '13', title: '开发实现', role: 'developer', mode: 'derived' },
      { id: '14', title: '开发自测', role: 'developer', mode: 'record' },
      { id: '15', title: '代码 Review', role: 'developer', mode: 'approval' },
      { id: '16', title: '持续集成 CI', role: 'developer', mode: 'record' },
      { id: '17', title: '联调准入', role: 'developer', mode: 'approval' },
    ],
  },
  {
    id: 'testing',
    title: '测试与验收',
    nodes: [
      { id: '18', title: '测试执行', role: 'tester', mode: 'derived' },
      { id: '19', title: '缺陷管理', role: 'tester', mode: 'derived' },
      { id: '20', title: '测试通过 / 提测准出', role: 'tester', mode: 'derived' },
      { id: '21', title: 'UAT / 验收确认', role: 'product', mode: 'derived' },
    ],
  },
  {
    id: 'release',
    title: '发布与灰度',
    nodes: [
      { id: '22', title: '发布准入评审', role: 'product', mode: 'approval' },
      { id: '23', title: '正式构建 / 制品管理', role: 'developer', mode: 'record' },
      { id: '24', title: '灰度发布', role: 'developer', mode: 'derived' },
      { id: '25', title: '灰度分析', role: 'developer', mode: 'record' },
      { id: '26', title: '全量发布', role: 'product', mode: 'derived' },
      { id: '27', title: '发布验证 / 回滚 / 热修复', role: 'developer', mode: 'derived' },
    ],
  },
  {
    id: 'feedback',
    title: '反馈与沉淀',
    nodes: [
      { id: '28', title: '效果分析', role: 'product', mode: 'record' },
      { id: '29', title: '版本复盘', role: 'product', mode: 'derived' },
      { id: '30', title: '知识沉淀', role: 'product', mode: 'derived' },
      { id: '31', title: '需求回流 / 下一版本规划', role: 'product', mode: 'record' },
    ],
  },
]
