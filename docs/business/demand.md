# 需求管理 (Demand)

## 流程

1. **Audience Agent** 创建心愿 → 发布 `wish.created`
2. **Demand Agent** 聚合同类心愿（相同 genre + city + date ±3d）
3. 当心愿数量达到阈值 → 发布 `demand.threshold_reached`
4. **Demand Agent** 创建需求群组 → 发布 `demand.created`

## 阈值规则

```
threshold = max(MIN_THRESHOLD, wish_count_accumulated)
```

- `MIN_THRESHOLD = 10`（最低 10 个心愿触发）
- 实际容量在 Matching 阶段与 Venue 协商后确定，然后调整门票数量

## 注意

> 原公式 `threshold = max(MIN_THRESHOLD, ceil(total_capacity * 0.3))` 存在时序问题：
> 场地容量在 Matching 之后才确定，此时 Demand 尚未创建，无法依赖 capacity 计算阈值。
>
> 修正方案：Demand Agent 以 `MIN_THRESHOLD = 10` 作为初始阈值触发需求创建；
> `capacity` 在 Matching 阶段由 Venue Agent 提供，门票数量由 Settlement Agent 在链上决定。

## 需求聚合维度

- **Genre**: 音乐风格
- **City**: 城市
- **Preferred Date**: 首选日期（±3 天范围）
