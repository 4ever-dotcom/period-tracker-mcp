const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 处理 GET 请求，用于健康检查
app.get('/', (req, res) => {
  res.json({
    name: 'period-tracker-mcp',
    version: '1.0.0',
    description: '月经周期记录 MCP 服务'
  });
});

// 处理 MCP 工具调用
app.post('/', async (req, res) => {
  const { method, params } = req.body;

  try {
    if (method === 'record_period') {
      // 记录月经开始日期
      const { date, flow, symptoms, notes } = params;
      const { data, error } = await supabase
        .from('periods')
        .insert([{ 
          start_date: date,
          flow_level: flow,
          symptoms: symptoms,
          notes: notes
        }]);

      if (error) throw error;
      res.json({ success: true, data });

    } else if (method === 'get_cycle_history') {
      // 获取月经周期历史
      const { limit = 10 } = params;
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      res.json({ success: true, data });

    } else if (method === 'predict_next_period') {
      // 预测下次月经时间
      const { data, error } = await supabase
        .from('periods')
        .select('start_date')
        .order('start_date', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (data.length < 2) {
        res.json({ 
          success: true, 
          message: '记录太少，无法预测',
          predicted_date: null 
        });
        return;
      }

      // 计算平均周期长度
      let totalDays = 0;
      for (let i = 0; i < data.length - 1; i++) {
        const days = Math.floor(
          (new Date(data[i].start_date) - new Date(data[i + 1].start_date)) 
          / (1000 * 60 * 60 * 24)
        );
        totalDays += days;
      }
      const avgCycle = Math.round(totalDays / (data.length - 1));
      
      const lastDate = new Date(data[0].start_date);
      const predictedDate = new Date(lastDate.getTime() + avgCycle * 24 * 60 * 60 * 1000);

      res.json({ 
        success: true, 
        average_cycle: avgCycle,
        predicted_date: predictedDate.toISOString().split('T')[0]
      });

    } else {
      res.status(400).json({ error: 'Unknown method' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Period Tracker MCP running on port ${PORT}`);
});
