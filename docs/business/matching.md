# 匹配系统 (Matching)

## 匹配流程

1. **Demand Agent** 发布 `demand.created`
2. **Matching Agent** 监听事件，触发匹配
3. 从 Registry 搜索符合条件的 musician + venue
4. 评分排序 → 返回 Top 3 候选

## 评分公式

```
总分 = Genre_Match × 40% + Location_Match × 30% + Availability × 20% + Reputation × 10%
```

### 因子说明

| 因子 | 权重 | 说明 |
|------|------|------|
| Genre Match | 40% | 音乐风格与需求匹配度 |
| Location Match | 30% | 地理位置匹配度 |
| Availability | 20% | 档期可用性 |
| Reputation | 10% | Agent 声誉评分 |

## 输出

```json
{
  "demandId": "demand-uuid",
  "musicians": [
    { "agentId": "agent:musician:001", "score": 92, "reason": "genre:rock(40)+city:shanghai(30)+available(20)+reputation(2)" },
    { "agentId": "agent:musician:002", "score": 78, ... }
  ],
  "venues": [
    { "agentId": "agent:venue:001", "score": 88, ... }
  ]
}
```
