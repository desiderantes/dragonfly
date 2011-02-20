window.cls || (window.cls = {});

cls.Breakpoint = function(id, script_id, line_nr, event_type)
{
  this.id = id;
  this.script_id = script_id || "";
  this.line_nr = line_nr || 0;
  this.event_type = event_type || "";
  this.type = this.script_id ? "source" : "event";
  this.is_enabled = true;
  this.condition = "";
};


cls.Breakpoints = function()
{

  if (cls.Breakpoints.instance)
  {
    return cls.Breakpoints.instance;
  }

  cls.Breakpoints.instance = this;
  
  /* interface */
  
  this.get_breakpoints = function(){};
  this.get_breakpoint_with_id = function(bp_id){};
  this.get_breakpoint_id_with_script_id_and_line_nr = function(script_id, line_nr){};
  this.get_breakpoint_id_with_event_name = function(event_name){};
  this.delete_breakpoint = function(bp_id){};
  this.set_condition = function(condition, bp_id){};
  this.get_condition = function(bp_id){};
  
  /* constants */
  
  const 
  BP_NONE = cls.NewScript.BP_NONE;
  BP_DELTA_CONDITION = cls.NewScript.BP_ENABLED_CONDITION - 
                       cls.NewScript.BP_ENABLED;

  this.get_breakpoints = function()
  {
    return this._bps;
  }

  this.get_breakpoint_with_id = function(bp_id)
  {
    return this._bps[this._get_bp_index(bp_id)];
  };

  this.get_breakpoint_id_with_script_id_and_line_nr = function(script_id, line_nr)
  {
    for(var i = 0, bp; bp = this._bps[i]; i++)
    {
      if (bp.script_id == script_id && bp.line_nr == line_nr)
      {
        return bp.id;
      }
    }
    return 0;
  };
    
  this._update_bp_state = function(bp, delta, absolute)
  {
    var script = bp && window.runtimes.getScript(bp.script_id);
    if (script)
    {
      if (delta)
      {
        script.breakpoint_states[bp.line_nr] += delta;
      }
      else
      {
        script.breakpoint_states[bp.line_nr] = absolute;
      }
      window.messages.post('breakpoint-state-changed', {script_id: bp.script_id,
                                                        line_nr: bp.line_nr,
                                                        id: bp.id});
    }
  }

  this.delete_breakpoint = function(bp_id)
  {
    this._update_bp_state(this.get_breakpoint_with_id(bp_id), 0, BP_NONE);
    this._bps.splice(this._get_bp_index(bp_id), 1);
    window.views.breakpoints.update();
  }

  this.get_breakpoint_id_with_event_name = function(event_name)
  {
    for(var i = 0, bp; bp = this._bps[i]; i++)
    {
      if (bp.event_type == event_name)
      {
        return bp.id;
      }
    }
    return 0;
  };

  this.set_condition = function(condition, bp_id)
  {
    var bp = this.get_breakpoint_with_id(bp_id);
    if (bp)
    {
      if (condition && !bp.condition)
      {
        this._update_bp_state(bp, BP_DELTA_CONDITION);
      }
      else if(!condition && bp.condition)
      {
        this._update_bp_state(bp, -BP_DELTA_CONDITION);
      }
      bp.condition = condition;
    }
  };

  this.get_condition = function(bp_id)
  {
    var bp = this.get_breakpoint_with_id(bp_id);
    return bp && bp.condition || "";
  };

  this._onbpadded = function(msg)
  {
    var bp = this.get_breakpoint_with_id(msg.id);
    if (bp)
    {
      bp.is_enabled = true;
    }
    else
    {
      this._bps.push(new this._bp_class(msg.id, 
                                        msg.script_id, 
                                        msg.line_nr, 
                                        msg.event_type));
      
    }
    window.views.breakpoints.update();
  };

  this._onbpremoved = function(msg)
  {
    var bp = this.get_breakpoint_with_id(msg.id);
    if (bp)
    {
      bp.is_enabled = false;
    }
    window.views.breakpoints.update();
  };

  this._onscriptidreplaced = function(msg)
  {
    for (var i = 0, bp; bp = this._bps[i]; i++)
    {
      if (bp.script_id == msg.old_script_id)
      {
        bp.script_id = msg.new_script_id;
      }
    }
  };

  this._get_bp_index = function(id)
  {
    for(var i = 0; i < this._bps.length && this._bps[i].id != id; i++);
    return i;
  }





  this._init = function()
  {
    this._bps = [];
    this._bp_class = window.cls.Breakpoint;
    window.messages.addListener('breakpoint-added', this._onbpadded.bind(this));
    window.messages.addListener('breakpoint-removed', this._onbpremoved.bind(this));
    window.messages.addListener('script-id-replaced', this._onscriptidreplaced.bind(this));
    
  }

  this._init();
};

cls.Breakpoints.get_instance = function()
{
  return this.instance || new cls.Breakpoints();
};



