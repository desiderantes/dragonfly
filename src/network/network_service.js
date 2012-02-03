﻿/**
 *
 */

cls.NetworkLoggerService = function(view)
{
  if (cls.NetworkLoggerService.instance)
  {
    return cls.NetworkLoggerService.instance;
  }
  cls.NetworkLoggerService.instance = this;

  this._view = view;
  this._current_context = null;

  this._on_abouttoloaddocument_bound = function(msg)
  {
    var data = new cls.DocumentManager["1.0"].AboutToLoadDocument(msg);
    // if not a top resource, don't reset the context. This usually means it's an iframe or a redirect
    if (data.parentDocumentID) { return; }
    this._current_context = new cls.RequestContext();
    this._current_context.saw_main_document_abouttoloaddocument = true; // todo: it would be good to make an indicator in the view that all requests may be shown
  }.bind(this);

  this._on_documentevent_bound = function(msg)
  {
    // todo: This will be only store for top documents.
    // the last _on_abouttoloaddocument without parentDocumentID is not always the top document,
    // but it can be a redirect instead.

    // todo: there can be more then one top document, this needs to be reflected in the structure.
/*
    var data = new cls.DocumentManager["1.2"].DocumentEvent(msg);
    var type = new cls.DocumentManager["1.2"].DocumentEventType[data.eventType];
    if (this._current_context &&
        type === "DOMCONTENTLOADED_START" || type === "LOAD_START")
    {
        this._current_context.update_document_event(event_name, data);
    }
*/
  }.bind(this);

  this._on_urlload_bound = function(msg)
  {
    if (!this._current_context)
    {
      this._current_context = new cls.RequestContext();
    }
    var data = new cls.ResourceManager["1.2"].UrlLoad(msg);

    this._current_context.update("urlload", data);
  }.bind(this);

  this._on_urlredirect_bound = function(msg)
  {
    if (!this._current_context) { return; }

    var data = new cls.ResourceManager["1.0"].UrlRedirect(msg);
    // a bit of cheating since further down we use .resouceID to determine
    // what resource the event applies to:
    data.resourceID = data.fromResourceID;
    this._current_context.update("urlredirect", data);
  }.bind(this);

  this._on_urlfinished_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].UrlFinished(msg);
    this._current_context.update("urlfinished", data);
  }.bind(this);

  this._on_response_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].Response(msg);
    this._current_context.update("response", data);
  }.bind(this);

  this._on_request_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].Request(msg);
    this._current_context.update("request", data);
  }.bind(this);

  this._on_requestheader_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].RequestHeader(msg);
    this._current_context.update("requestheader", data);
  }.bind(this);

  this._on_requestfinished_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].RequestFinished(msg);
    this._current_context.update("requestfinished", data);
  }.bind(this);

  this._on_requestretry_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].RequestRetry(msg);
    this._current_context.update("requestretry", data);
  }.bind(this);

  this._on_responseheader_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].ResponseHeader(msg);
    this._current_context.update("responseheader", data);
  }.bind(this);

  this._on_responsefinished_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.0"].ResponseFinished(msg);
    this._current_context.update("responsefinished", data);
  }.bind(this);

  this._on_urlunload_bound = function(msg)
  {
    if (!this._current_context) { return; }
    var data = new cls.ResourceManager["1.2"].UrlUnload(msg);
    this._current_context.update("urlunload", data);
  }.bind(this);

  this._on_debug_context_selected_bound = function()
  {
    this._current_context = null;
    this._view.update();
  }.bind(this);

  this.init = function()
  {
    this._res_service = window.services['resource-manager'];
    this._res_service.addListener("urlload", this._on_urlload_bound);
    this._res_service.addListener("request", this._on_request_bound);
    this._res_service.addListener("requestheader", this._on_requestheader_bound);
    this._res_service.addListener("requestfinished", this._on_requestfinished_bound);
    this._res_service.addListener("requestretry", this._on_requestretry_bound);
    this._res_service.addListener("responseheader", this._on_responseheader_bound);
    this._res_service.addListener("response", this._on_response_bound);
    this._res_service.addListener("responsefinished", this._on_responsefinished_bound);
    this._res_service.addListener("urlredirect", this._on_urlredirect_bound);
    this._res_service.addListener("urlfinished", this._on_urlfinished_bound);
    this._res_service.addListener("urlunload", this._on_urlunload_bound);
    this._doc_service = window.services['document-manager'];
    this._doc_service.addListener("abouttoloaddocument", this._on_abouttoloaddocument_bound);
   //  this._doc_service.addListener("documentevent", this._on_documentevent_bound);
    messages.addListener('debug-context-selected', this._on_debug_context_selected_bound)
  };

  this.get_body = function(itemid, callback)
  {
    if (!this._current_context) { return; }
    var entry = this._current_context.get_entry(itemid);
    var contentmode = cls.ResourceUtil.mime_to_content_mode(entry.mime);
    var typecode = {datauri: 3, string: 1}[contentmode] || 1;
    var tag = window.tagManager.set_callback(null, this._on_get_resource_bound, [callback, entry.resource]);
    this._res_service.requestGetResource(tag, [entry.resource, [typecode, 1]]);
  };

  this._on_get_resource_bound = function(status, data, callback, resourceid)
  {
    if (status != 0)
    {
      if (!this._current_context) { return; }
      this._current_context.update("responsebody", {resourceID: resourceid}); // this is to set body_unavailable, the object passed represents empty event_data
      if (callback) { callback() }
    }
    else
    {
      var msg = new cls.ResourceManager["1.2"].ResourceData(data);
      if (!this._current_context) { return; }
      this._current_context.update("responsebody", msg);
      if (callback) { callback() }
    }
  }.bind(this);

  this.get_request_context = function()
  {
    return this._current_context;
  };

  this.clear_request_context = function()
  {
    this._current_context = null;
  };

  this.pause = function()
  {
    if (this._current_context)
      this._current_context.pause();
  };

  this.unpause = function()
  {
    if (this._current_context)
      this._current_context.unpause();
  };

  this.is_paused = function()
  {
    if (this._current_context)
      return this._current_context._paused;
  };
  this.init();
};


cls.RequestContext = function()
{
  this._logger_entries = [];
  this._document_notifications = {};
  this._filters = [];

  // When this is constructed, the context is not paused. Reset the setting.
  // Todo: Ideally, when paused, the new context should be created in a different
  // place, so the old one can be kept while we're on pause.
  settings.network_logger.set("pause", false);

  this._filter_function_bound = function(item)
  {
    var success = false;
    var filters = this._filters;
    if (!filters.length)
    {
      success = true;
    }
    else
    {
      for (var i = 0, filter; filter = filters[i]; i++)
      {
        if (filter && filter.value_list && filter.value_list.length)
        {
          var has_match = filter.value_list.contains(item.type) || 
                          filter.value_list.contains(item.load_origin) || 
                          filter.value_list.contains("");
          if (has_match !== filter.is_blacklist)
          {
            success = true;
            break;
          }
        }
      }
    }
    return success;
  }.bind(this);

  this.update_document_event = function(event_name, data)
  {
    if (!this._document_notifications[data.documentID])
      this._document_notifications[data.documentID] = {};
    this._document_notifications[data.documentID][event_name] = data;

    views.network_logger.update();
  }

  this._invalid_if_not_touched_network_filter = function(entry)
  {
    if (entry.invalid_if_not_touched_network && !entry.touched_network)
      return false;
    return true;
  }

  this.get_entries_filtered = function()
  {
    return this.get_entries().filter(this._filter_function_bound);
  }

  this.get_entries = function()
  {
    var entries = this._logger_entries;
    if (this.is_paused())
      entries = this._paused_entries;

    return entries.filter(this._invalid_if_not_touched_network_filter);
  }

  this.get_entries_with_res_id = function(res_id)
  {
    return this._logger_entries.filter(function(e){return e.resource === res_id});
  }

  this.set_filter = function(filters)
  {
    this._filters = [];
    for (var i = 0; i < filters.length; i++)
    {
      var filter = filters[i];
      var blacklist_split = filter.split("|");
      this._filters.push({
        value_list: blacklist_split[0].split(","),
        is_blacklist: (blacklist_split[1] === "true")
      })
    }
  }

  this.pause = function()
  {
    // this only freezes what entries are shown, but they still get updates themselves
    // this works good as long as we don't have things like streaming.
    this._paused_entries = this._logger_entries.slice(0);
    this._paused = true;
  }

  this.unpause = function()
  {
    this._paused_entries = null;
    this._paused = false;
  }

  this.is_paused = function()
  {
    return this._paused;
  };

  this.get_duration = function()
  {
    var entries = this.get_entries_filtered();
    if (entries.length)
    {
      var starttimes = entries.map(function(e) { return e.starttime });
      var endtimes = entries.map(function(e) { return e.endtime });
      return Math.max.apply(null, endtimes) - Math.min.apply(null, starttimes);
    }
    return 0;
  };

  /**
   * Return duration of request context.
   * if width and padlen is set, add the ammount of milliseconds needed to
   * the duration needed to accomodate padlen pixels.
   */
  this.get_coarse_duration = function(padlen, width)
  {
    var t = this.get_duration();
    if (padlen && width)
    {
      var millis_per_px = t / width;
      t += (millis_per_px * padlen);
    }

    return t;
  };

  this.get_starttime = function()
  {
    return Math.min.apply(null, this.get_entries_filtered().map(function(e) { return e.starttime }));
  };

  this._event_changes_req_id = function(event, last_entry)
  {
    /* 
      Checks if the events requestID is different from the one in the last_entry.
      That shouldn't happen, because "urlload" doesn't have a requestID, and that
      will initiate a new entry.
    */
    return event.requestID &&
           (last_entry.requestID !== event.requestID);
  }

  this.update = function(eventname, event)
  {
    var logger_entry = this.get_entries_with_res_id(event.resourceID).last;
    if (!logger_entry && eventname !== "urlload")
    {
      // ignoring. Never saw an urlload, or it's already invalidated
      return;
    }

    if (logger_entry && logger_entry.requestID)
    {
      var changed_request_id = this._event_changes_req_id(event, logger_entry);
      if (changed_request_id)
      {
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
                        " Unexpected change in requestID on " + eventname +
                        ": Change from " + logger_entry.requestID + " to " + 
                        event.requestID + ", URL: " + logger_entry.human_url);
      }
    }

    if (eventname == "urlload" || changed_request_id)
    {
      var id = event.resourceID + ":" + this._logger_entries.length;
      logger_entry = new cls.NetworkLoggerEntry(id, this, event.resourceID, event.documentID);
      if (this.get_entries_with_res_id(event.resourceID).length)
      {
        // A second request to a resource is only to be rendered when it touched network. 
        // Everything else is most likely an internal request, happens randomly and 
        // doesn't mean much. See CORE-43063.
        logger_entry.invalid_if_not_touched_network = true;
      }
      this._logger_entries.push(logger_entry);
    }
    logger_entry.requestID = event.requestID;
    logger_entry.update(eventname, event);

    views.network_logger.update();
  };

  this.get_entry = function(id)
  {
    return this.get_entries_filtered().filter(function(e) { return e.id == id; })[0];
  };
};

cls.NetworkLoggerEntry = function(id, context, resource, document_id)
{
  this.id = id;
  this.context = context;
  this.resource = resource;
  this.document_id = document_id;
  this.url = null;
  this.human_url = "No URL";
  this.result = null;
  this.mime = null;
  this.encoding = null;
  this.size = null;
  this.type = null;
  this.urltype = null;
  this.starttime = null;
  this.starttime_relative = null;
  this.requesttime = null;
  this.endtime = null;
  this.touched_network = false;
  this.request_headers = null;
  this.request_type = null;
  this.requestbody = null;
  this.responses = [];
  this.responsecode = null;
  this.request_raw = null;
  this.method = null;
  this.status = null;
  this.body_unavailable = false;
  this.unloaded = false;
  this.is_finished = null;
  this.events = [];
  this.event_gaps = [];

  this.update = function(eventname, eventdata)
  {
    var updatefun = this["_update_event_" + eventname];

    if (!this.events.length)
    {
      this.starttime = eventdata.time; // todo: if we tune in in the middle of a request, this will be wrong.
      this.starttime_relative = this.starttime - this.context.get_starttime();

      var d = new Date(this.starttime);
      var h = "" + d.getHours();
      if (h.length < 2)
        h = "0" + h;
      var m = "" + d.getMinutes();
      if (m.length < 2)
        m = "0" + m;
      var s = "" + d.getSeconds();
      if (s.length < 2)
        s = "0" + s;
      var ms = "" + d.getMilliseconds();
      while (ms.length < 3)
        ms = "0" + ms;
      this.start_time_string = h + ":" + m + ":" + s + ":" + ms;
    }
    var unlisted_events = ["responsebody", "urlunload"];
    if (!unlisted_events.contains(eventname))
    {
      this.endtime = eventdata.time;
      this._add_event(eventname, eventdata);
    }

    if (updatefun)
    {
      updatefun.call(this, eventdata);
    }
    else
    {
      opera.postError("got unknown event: " + eventname);
    }
  };

  
// gap_def format: 
/* {
     "classname": "type of sequence",
     "sequences": {
       "from_event_name": [
         "to_event_name_one",
         "to_event_name_two"
       ]
     }
   } */

  this._gap_defs = [
    {
      classname: "blocked",
      sequences: {
        "urlload": {
          "request": "Waiting to request",
          "urlredirect": "Redirecting",
          "urlfinished": "Reading cache",
          // The response-phase can be closed without ever seeing a response event, for 
          // example because the request was aborted. See CORE-43284.
          "responsefinished": "(aborted)"
        },
        "responseheader": {
          "urlredirect": "Redirecting",
          "requestretry": "Retrying" // Todo: Not really. How should we call it?
        },
        "requestfinished": {
          "requestretry": "Retrying", // Todo: Not really. How should we call it?
        },
        "requestretry": {
          "request": "Waiting to request"
        },
        "responsefinished": {
          "urlfinished": "Processing url", // not sure what is really going on now
          // responsefinished can occur twice, see CORE-43284.
          // This is fixed and stops showing up when integrated.
          "responsefinished": ""
        },
        "urlredirect": {
          "urlfinished": "Finishing url",
          "responsefinished": "Closing request" // responsefinished means we stopped listening. So the time is used to close the request
        }
      }
    },
    {
      classname: "request",
      sequences: {
        "request": {
          "requestheader": "Writing request header"
        },
        "requestheader": {
          "requestfinished": "Writing request body"
        }
      }
    },
    {
      classname: "waiting",
      sequences: {
        "requestfinished": {
          "response": "Waiting for response",
          "responsefinished": "Closing response" // This also means "Aborted waiting for response". We can add responsefinished as an event and make it stand out more.
        },
        "responseheader": {
          // Occurs when a 100-Continue response was sent. In this timespan the client has
          // ignored it and waits for another response to come in. See CORE-43264.
          "response": "Waiting for response"
        }
      }
    },
    {
      classname: "receiving",
      sequences: {
        "response": {
          "responseheader": "Reading response header"
        },
        "responseheader": {
          "responsefinished": "Reading response body"
        }
      }
    }
  ];

  this.get_gap_def = function(gap)
  {
    var def = this._gap_defs.filter(function(def){
      return def.sequences[gap.from_event.name] &&
             def.sequences[gap.from_event.name][gap.to_event.name];
    })[0];
    if (def)
      return {classname: def.classname, title: def.sequences[gap.from_event.name][gap.to_event.name]};
    else
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "Unexpected event sequence between " + gap.from_event.name + " and " + gap.to_event.name);
  };

  this._add_event = function(eventname, eventdata)
  {
    var evt = {name: eventname, time: eventdata.time, request_id: eventdata.requestID};
    // add to events
    this.events.push(evt);

    // add to event gaps.
    if (this.event_gaps.length)
    {
      var gap = this.event_gaps.last;
      gap.to_event = evt; // it's probably not needed to even store these

      // gap now has from and to. Add val, val_string, classname, title.
      gap.val = gap.to_event.time - gap.from_event.time;
      gap.val_string = gap.val.toFixed(2) + "ms";
      var gap_def = this.get_gap_def(gap); // pass from and to names instead
      gap.classname = (gap_def && gap_def.classname) || "";
      gap.title = (gap_def && gap_def.title) || "";
    }
    // the evt is also the next gaps from_event.
    this.event_gaps.push({from_event: evt});
  }

  this.get_duration = function()
  {
    return this.events.length && this.endtime - this.starttime;
  }

  this._update_event_urlload = function(event)
  {
    this.url = event.url;
    this.filename = helpers.basename(event.url, true);
    this.urltype = event.urlType;
    this.document_id = event.documentID;
    if (event.loadOrigin)
      this.load_origin = cls.ResourceManager["1.2"].LoadOrigin[event.loadOrigin].toLowerCase();
    this.urltypeName = cls.ResourceManager["1.2"].UrlLoad.URLType[event.urlType].toLowerCase();
    this._humanize_url();
    this._guess_type(); // may not be correct before mime is set, but will be guessed again when it is
  };

  this._update_event_urlunload = function(event)
  {
    this.unloaded = true;
  };

  this._update_event_urlfinished = function(event)
  {
    this.result = event.result;
    this.mime = event.mimeType;
    this.encoding = event.characterEncoding;
    this.size = event.contentLength;

    // the assumption is that if we got this far, and there was no
    // response code, meaning no request was sent, the url was cached.
    // except for DATA URIs
    if (!this.responsecode && this.urltype != cls.ResourceManager["1.2"].UrlLoad.URLType.DATA)
    {
      this.cached = true;
    }

    this.is_finished = true;
    this._guess_type();
    this._humanize_url();
  };

  this._update_event_request = function(event)
  {
    // We assume that there is never more then one network-request,
    // as opposed to responses which are kept in a list.
    this.method = event.method;
    this.touched_network = true;
  };

  this._update_event_requestheader = function(event)
  {
    this.request_headers = event.headerList;
    this.request_raw = event.raw;
    for (var n=0, header; header = this.request_headers[n]; n++)
    {
      if (header.name.toLowerCase() == "content-type")
      {
        this.request_type = header.value;
        break;
      }
    }
  };

  this._update_event_requestfinished = function(event)
  {
    if (event.data)
    {
      this.requestbody = event.data;
      // in time we can use the mime-type member here rather than grabbing it
      // from the headers. See CORE-39597
      this.requestbody.mimeType = this.request_type;
    }
    this.requesttime = event.time;
  };

  this._update_event_requestretry = function(event)
  {
    this.requestID = event.toRequestID;
  };

  this._update_event_response = function(event)
  {
    // entry.responsecode always gets overwritten on the entry,
    // but also stored per NetworkLoggerResponse.
    this.responsecode = event.responseCode;
    if (!this.responsestart)
      this.responsestart = event.time;

    this._current_response = new cls.NetworkLoggerResponse(this);
    this.responses.push(this._current_response);
    this._current_response._update_event_response(event);
  };

  this._update_event_responseheader = function(event)
  {
    // Sometimes we see no "response" event before we see responseheader,
    // therefor have to init NetworkLoggerResponse here. See CORE-43935.
    if (!this._current_response)
    {
      this._current_response = new cls.NetworkLoggerResponse(this);
      this.responses.push(this._current_response);
    }
    this._current_response._update_event_responseheader(event);
  };

  this._update_event_responsefinished = function(event)
  {
    if (this._current_response)
      this._current_response._update_event_responsefinished(event);
  };

  this._update_event_responsebody = function(event)
  {
    if (!this._current_response)
    {
      this._current_response = new cls.NetworkLoggerResponse(this);
      this.responses.push(this._current_response);
    }
    this._current_response._update_event_responsebody(event);
  };

  this._update_event_urlredirect = function(event)
  {
    // this does not add any information, the event is only used to change the requestID
  };

  this._guess_type = function()
  {
    this.type = cls.ResourceUtil.path_to_type(this.url);

    if (this.mime && this.mime.toLowerCase() !== "application/octet-stream")
    {
      this.type = cls.ResourceUtil.mime_to_type(this.mime);
    }
  };

  this._humanize_url = function()
  {
    this.human_url = this.url;
    if (this.urltype == 4) // data URI
    {
      if (this.type)
      {
        this.human_url = this.type + " data URI";
      }
      else
      {
        this.human_url = "data URI";
      }
    }
  };
};

cls.NetworkLoggerResponse = function(entry)
{
  this.entry = entry;
  this.responsestart = null;
  this.responsecode = null;
  this.response_headers = null;
  this.response_raw = null;
  this.responsebody = null;

  this._update_event_response = function(event)
  {
    this.responsecode = event.responseCode;
    // if (this.responsecode == "304") { this.entry.cached = true }
    // todo: from the network side of things, this is not cached in the same sense as we use .cached in other places. 
    // it should probably be differentiated, I tend to not treat this any different at all.
  };

  this._update_event_responseheader = function(event)
  {
    this.response_headers = event.headerList;
    this.response_raw = event.raw;
  };

  this._update_event_responsefinished = function(event)
  {
    if (event.data && event.data.content)
    {
      this.responsebody = event.data;
    }
  };

  this._update_event_responsebody = function(event)
  {
    if (!event.mimeType) { this.body_unavailable = true; }
    this.responsebody = event;
  };
}