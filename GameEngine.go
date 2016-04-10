package spacecluster

import (
    "os"
    "runtime"
    "github.com/spf13/viper"
    "github.com/valyala/fasthttp"
    log "github.com/Sirupsen/logrus"
)

/*
 * Game Engine Base
*/

var initialized = false

func init() {
    // Load logger
    log.SetFormatter(&log.JSONFormatter{})
    log.SetLevel(log.InfoLevel)
    log.SetOutput(os.Stderr)

    // Load configuration
    viper.SetConfigName("config")
    viper.AddConfigPath("/etc/appname/")
    viper.AddConfigPath("$HOME/.appname")
    viper.AddConfigPath(".")
    setDefaultViperConfig()
    err := viper.ReadInConfig()
    if err != nil {
        log.Panicf("Fatal error config file: %s \n", err)
    }

    // Load log level
    level, err := log.ParseLevel(viper.GetString("server.log_level"))
    if err != nil {
        log.Error("Cannot load log level from config: ", err)
    } else {
        log.SetLevel(level)
    }

    // Load processor max count
    procs := viper.GetInt("server.max_procs")
    if (procs < 0) {
        procs = runtime.NumCPU()
    }
    runtime.GOMAXPROCS(procs)
}

func main() {
    // Start HTTP server
    h := httpRequestHandler
	if viper.GetBool("server.http.enable_compression") {
		h = fasthttp.CompressHandler(h)
	}
	if err := fasthttp.ListenAndServe(viper.GetString("server.address"), h);
    err != nil {
		log.Fatalf("Error in ListenAndServe: %s", err)
	}
}

func setDefaultViperConfig() {
    viper.SetDefault("server.address", ":8080")
    viper.SetDefault("server.name", "UNKNOWN")
    viper.SetDefault("server.region", "UNKNOWN")
    viper.SetDefault("server.log_level", "warn")
    viper.SetDefault("server.max_procs", "warn")
    viper.SetDefault("server.http.enable_compression", true)
    viper.SetDefault("game_engine.max_players", 256)
    viper.SetDefault("game_engine.tick_rate", 30)
    viper.SetDefault("game_engine.frame_lookback_length", 30)
    viper.SetDefault("game_engine.player_kick_timeout", 3)
}

func httpRequestHandler(ctx *fasthttp.RequestCtx) {

}

/*
 * Game Engine Core
*/

// GameEngine exported
var GameEngine gameEngine

type gameEngine struct {
    tick uint64
    playerCount uint32
    frames []gameFrame
    objects []gameObject
    broadcastFrame gameFrame
}

type gameFrame struct {
    tick uint64
    events []GameEvent
    updates []GameObjUpdate
}

type gameObject struct {
    state GameObjUpdate
    isPlayer bool
}
